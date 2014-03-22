{ /* CLASSES */

  { // Utility

    var Utility =
    {
  
      getAbsoluteOffset : function(element)
      {
        // possibly the same as jQuery.offset(), at least in nominal cases
        var offset = { top : 0, left : 0 };
        do
        {
          offset.top     += element.offsetTop  || 0;
          offset.left    += element.offsetLeft || 0;
          element         = element.offsetParent;
        } while(element);

        return offset;
      },
    
      shuffle : function (array)
      {
        /* Fisher-Yates Shuffle as described ingeniously here:
         * http://bost.ocks.org/mike/shuffle/
         */
        var m = array.length, t, i;

        // While there remain elements to shuffle…
        while (m)
        {

          // Pick a remaining element…
          i = Math.floor(Math.random() * m--);

          // And swap it with the current element.
          t = array[m];
          array[m] = array[i];
          array[i] = t;
        }

        return array;
      },

      animation : 
      {
        slide : function(element, offset, millis, callback)
        {
          $(element).animate(offset, {duration:millis, queue:false, complete:callback});
        },
        
        flip : function(element, millis, change, callback)
        {
          var width = $(element).width();
          $(element).animate({'width': 0}, {duration:millis/2, queue:false, complete:function()
          {
            change();
            $(element).animate({'width': width}, {duration:millis/2, queue:false, complete:callback});
          }});
        }
      },
      
      cardLayout :
      {
        stack :
        {
          /**
           * Get the designated coordinates of a card.
           * 
           * @param position   the position of this card within the layout.
           * @param count      the number of cards in the layout.
           * @returns          the card's designated position as an offset.
           */
          getCoordinates : function(position, count)
          {
            var mod = Math.floor(Math.sqrt(position));
            return { top:mod-1, left:mod };
          },
          
          getDimensions : function(count)
          {
            var coords = Utility.cardLayout.stack.getCoordinates(count);
            return { height:Card.dimensions.height + coords.top, width:Card.dimensions.width + coords.left };
          }
        },
        
        verticalSplay :
        {
        
          getCoordinates : function(position, count)
          {
            return { top:position*20, left:0 };
          },
          
          getDimensions : function(count)
          {
            var coords = Utility.cardLayout.verticalSplay.getCoordinates(count);
            return { height:Card.dimensions.height + coords.top, width:Card.dimensions.width + coords.left };
          }
        },
        
        horizontalSplay :
        {
        
          getCoordinates : function(position, count)
          {
            return { top:0, left:position*25 };
          },
          
          getDimensions : function(count)
          {
            var coords = Utility.cardLayout.horizontalSplay.getCoordinates(count);
            return { height:Card.dimensions.height + coords.top, width:Card.dimensions.width + coords.left };
          }
        }
      },
      
      cardRule :
      {
        // NOTE: rules are written in such a way as to allow breakpointing the last line of each function
        // to catch notable events in a debugger.
        
        yes : function(){ return true; },
        no  : function(){ return false; },
        
        faceup : function(data)
        {
          if (typeof(data)      === 'undefined' || data      === null) return false;
          if (typeof(data.card) === 'undefined' || data.card === null) return false;
          
          return !data.card.state.facedown;
        },
        
        topCard : function(data)
        {
          if (typeof(data)      === 'undefined' || data      === null) return false;
          if (typeof(data.zone) === 'undefined' || data.zone === null) return false;
          if (typeof(data.card) === 'undefined' || data.card === null) return false;
          
          return data.zone.cards.length > 0 && data.card === data.zone.getLastCard();
        },
        
        sameSuit : function(data)
        {
          if (typeof(data)      === 'undefined' || data      === null) return false;
          if (typeof(data.zone) === 'undefined' || data.zone === null) return false;
          if (typeof(data.card) === 'undefined' || data.card === null) return false;
          
          return data.zone.cards.length == 0 || data.card.suit === data.zone.getLastCard().suit;
        },
        
        increment : function(data)
        {
          if (typeof(data)      === 'undefined' || data      === null) return false;
          if (typeof(data.zone) === 'undefined' || data.zone === null) return false;
          if (typeof(data.card) === 'undefined' || data.card === null) return false;
          
          return data.zone.cards.length == 0 || data.card.value === data.zone.getLastCard().value + 1;
        },
        
        decrement : function(data)
        {
          if (typeof(data)      === 'undefined' || data      === null) return false;
          if (typeof(data.zone) === 'undefined' || data.zone === null) return false;
          if (typeof(data.card) === 'undefined' || data.card === null) return false;
          
          return data.zone.cards.length == 0 || data.card.value === data.zone.getLastCard().value - 1;
        },
        
        increment_or_decrement : function(data)
        {
          return Utility.cardRule.increment(data) || Utility.cardRule.decrement(data);
        },
        
        startWithAce : function(data)
        {
          if (typeof(data)      === 'undefined' || data      === null) return false;
          if (typeof(data.zone) === 'undefined' || data.zone === null) return false;
          if (typeof(data.card) === 'undefined' || data.card === null) return false;
          
          return data.zone.cards.length > 0 || data.card.rank === 'A';
        },
        
        startWithKing : function(data)
        {
          if (typeof(data)      === 'undefined' || data      === null) return false;
          if (typeof(data.zone) === 'undefined' || data.zone === null) return false;
          if (typeof(data.card) === 'undefined' || data.card === null) return false;
          
          return data.zone.cards.length > 0 || data.card.rank === 'K';
        },
        
        alternateColors : function(data)
        {
          if (typeof(data)      === 'undefined' || data      === null) return false;
          if (typeof(data.zone) === 'undefined' || data.zone === null) return false;
          if (typeof(data.card) === 'undefined' || data.card === null) return false;
          
          return data.zone.cards.length == 0 || data.card.getColor() !== data.zone.getLastCard().getColor();
        }
      }

    };
  
  }

  { // Zone
  
    var Zone = function(id, layout, rules, css)
    {
      var self = this;
      
      this.id         = id;
      this.cards      = [];
      this.cardLayout = layout || Utility.cardLayout.stack;
      this.ruleset    = rules  || Object.create(null);
      this.css        = css    || Object.create(null);
      
      /**
       * Add a rule of a designated type to this zone.
       *
       * @param type the type of rule to add (string)
       * @param rule the rule to add (function)
       *
       * @return true if the rule was added, false on error
       */
      this.addRule    = function(type, rule)
      {
        if (type == null || rule == null) return false;
        
        if (typeof(self.ruleset[type]) === 'undefined')
        {
          self.ruleset[type] = [];
        }
        
        self.ruleset[type].push(rule);
        return true;
      };
      
      /**
       * Check a rule type.
       *
       * TODO: Need to define this better.
       *
       * @param type the rule type to check (string)
       * @param data the data required by this rule type (object)
       *
       * @return true if the rule check succeeds, false if it fails
       */
      this.checkRule  = function(type, data)
      {
        
        if (typeof(self.ruleset[type]) === 'undefined') return false;
        
        var rules = self.ruleset[type];
        
        // TODO: consider global bans on action types
        
        // check each rule in set, return false if any fail.
        for (var i = 0; i < rules.length; i++)
        {
          var passed = rules[i](data);
          
          if (!passed)
          {
            return false;
          }
        }
        return true;
      }
      
      this.getElement = function()
      {
        if (typeof(self.element) == 'undefined')
        {
          var $element = $('<div class="zone" id="' + self.id + '"></div>');
          self.element = $element[0];
          self.element.object = self;
          
          for (var key in self.css)
          {
            $element.css(key, self.css[key]);
          }
          
        }
        
        return self.element;
      };
      
      this.acquireCard = function(card)
      {
        var source      = Utility.getAbsoluteOffset(card.getElement());
        var destination = self.cardLayout.getCoordinates(self.cards.length);

        // TODO: for stack moving, need to handle this differently
        var chain = -1;
        var oldzone = card.zone;
        
        // TODO: this is a hack to prevent draggable from resetting z-index
        card.z = ++summit;
        $(card.getElement()).css('z-index',card.z);
        
        // remove from old zone
        if (oldzone)
        {
          // may need to move children as well
          if (oldzone.checkRule('moveStack', {zone:oldzone, card:card})) chain = oldzone.cards.indexOf(card);          
          oldzone.removeCard(card);
        }
        
        // add to new zone
        card.zone = self;
        
        // TODO: use some rules for draggable control
        /*
        for (var i = 0; i < self.cards.length; i++)
        {
          $(self.cards[i].getElement()).draggable({ disabled: true});
        }
        */
        
        self.cards.push(card);
        $(self.getElement()).append(card.getElement());
        
        // testing dynamic zone size
        $(self.getElement()).css(self.cardLayout.getDimensions(self.cards.length));
        
        // reset position relative to new parent
        $(card.getElement()).offset(source);
        
        // start animation
        Utility.animation.slide(card.getElement(), destination, 500);
        
        if (chain > -1 && oldzone.cards.length > chain)
        {
          $(oldzone.cards[chain].element).css('z-index', summit++);
          self.acquireCard(oldzone.cards[chain]);
        }
      };
      
      this.removeCard = function(card)
      {
        // find card in this zone
        var index = self.cards.indexOf(card);
        
        // not present
        if (index == -1) return false

        // TODO: what if bug / hack causes card to exist multiple times?
        
        // remove card from cards
        // TODO: validate with return value of element removed?
        self.cards.splice(index, 1);
        
        // recalculate remaining card positions
        for (var i = 0; i < self.cards.length; i++)
        {
          var belongs = self.cardLayout.getCoordinates(i, self.cards.length);
          Utility.animation.slide(self.cards[i].getElement(), belongs, 500);
        }
        
        if (self.cards.length > 0)
        {
          $(self.getLastCard().getElement()).draggable({ disabled: false });
          
          // TODO: do this somewhere else
          if (self.id == 'stack1' || self.id == 'stack2' || self.id == 'stack3' || self.id == 'stack4' || self.id == 'stack5' || self.id == 'stack6' || self.id == 'stack7' )
          {
            var next = self.getLastCard();
            if (next.state.facedown) Utility.animation.flip(next.getElement(), 500, function(){next.flipover();});
          }
        }
        
        // TODO: do this somewhere else
        if (self.id == 'deck')
          Utility.animation.flip(card.getElement(), 500, function(){$(card.flipover());});
        
      };

      this.getLastCard = function()
      {
        if (self.cards.length == 0) return null;
        return self.cards[self.cards.length-1];
      }
      
    }

  }

  { // Card
  
    var Card = function(value, suit)
    {
      var self = this;
      
      this.value = value;
      this.suit  = suit;
      
      this.rank  = this.value == '1'  ? 'A' : 
                   this.value == '11' ? 'J' :
                   this.value == '12' ? 'Q' :
                   this.value == '13' ? 'K' :
                   this.value;
      
      // An "index" is the marking on the corner of a standard playing card.
      this.index = this.rank + this.suit;      
      
      this.state =
      {
        facedown : false
      };
      
      this.rise = function()
      {
        // TODO: this is not the best way to accomplish temporary z-index values.
        // temporarily bring this card to the highest z-index
        self.z = $(self.getElement()).css('z-index');
        $(self.getElement()).css('z-index', ++summit);
      };
      
      this.fall = function()
      {
        // TODO: this is not the best way to accomplish temporary z-index values.
        // restore this card to its previous z-index
        $(self.getElement()).css('z-index', self.z);
      }
      
      this.flipover = function()
      {
        self.state.facedown = !self.state.facedown;
        
        if    (self.state.facedown)
          $(self.getElement()).addClass('facedown');
        else
          $(self.getElement()).removeClass('facedown');
        
        return self;
      };
      
      this.getColor = function()
      {
        if (this.suit == heart || this.suit == diamond) return 'red';
        if (this.suit == spade || this.suit == club) return 'black';
        return false;
      }
      
      this.getElement = function()
      {
        if (typeof(self.element) == 'undefined')
        {
          // TODO: not sure value goes here, added it to avoid using reflection in card rules
          var $element  = $('<div class="card" rank=' + self.rank + ' suit=' + self.suit + ' value=' + self.value + '></div>');
          $element.append($('<div class="corner tl">' + self.index + '</div>'));
          $element.append($('<div class="corner br">' + self.index + '</div>'));
          self.element  = $element[0];
          self.element.object = self;
        }
        
        return self.element;
      };
      
    }

  }
	
	// TODO: this is a placeholder until I decide on a method for encoding and including game rules.
	var patience =
	{

		klondike : function()
		{
			var self = this;
			
			this.rules =
			{
				deck : 
				{
					play   : [Utility.cardRule.topCard]
				},
				
				hand :
				{
					play   : [Utility.cardRule.topCard]
				},
				
				stack :
				{
					play        : [Utility.cardRule.topCard],
					accept      : [Utility.cardRule.decrement, Utility.cardRule.alternateColors, Utility.cardRule.startWithKing, Utility.cardRule.faceup],
					doubleclick : [Utility.cardRule.decrement, Utility.cardRule.alternateColors, Utility.cardRule.startWithKing, Utility.cardRule.faceup],
					moveStack   : [Utility.cardRule.yes]
				},
				
				pile :
				{
					play        : [Utility.cardRule.topCard],
					accept      : [Utility.cardRule.startWithAce, Utility.cardRule.increment, Utility.cardRule.sameSuit, Utility.cardRule.faceup],
					doubleclick : [Utility.cardRule.startWithAce, Utility.cardRule.increment, Utility.cardRule.sameSuit, Utility.cardRule.faceup]
				}
			};
			
			this.css =
			{
				deck :
				{
					top  : '50%',
					left : '50em'
				},
				
				hand :
				{
					top  : '50%',
					left : '45em'
				},
				
				pile1 :
				{
					top  : '2em',
					left : '10em'
				},
				
				pile2 :
				{
					top  : '2em',
					left : '15em'
				},
				
				pile3 :
				{
					top  : '2em',
					left : '20em'
				},
				
				pile4 :
				{
					top  : '2em',
					left : '25em'
				},
				
				stack1 :
				{
					top  : '10em',
					left : '5em'
				},
				
				stack2 :
				{
					top  : '10em',
					left : '10em'
				},
				
				stack3 :
				{
					top  : '10em',
					left : '15em'
				},
				
				stack4 :
				{
					top  : '10em',
					left : '20em'
				},
				
				stack5 :
				{
					top  : '10em',
					left : '25em'
				},
				
				stack6 :
				{
					top  : '10em',
					left : '30em'
				},
				
				stack7 :
				{
					top  : '10em',
					left : '35em'
				}
			}
			
			this.zones =
			{
				deck     : new Zone('deck'    , Utility.cardLayout.stack,         this.rules.deck,  this.css.deck),
				hand     : new Zone('hand'    , Utility.cardLayout.stack,         this.rules.hand,  this.css.hand),
				pile1    : new Zone('pile1'   , Utility.cardLayout.stack,         this.rules.pile,  this.css.pile1),
				pile2    : new Zone('pile2'   , Utility.cardLayout.stack,         this.rules.pile,  this.css.pile2),
				pile3    : new Zone('pile3'   , Utility.cardLayout.stack,         this.rules.pile,  this.css.pile3),
				pile4    : new Zone('pile4'   , Utility.cardLayout.stack,         this.rules.pile,  this.css.pile4),
				stack1   : new Zone('stack1'  , Utility.cardLayout.verticalSplay, this.rules.stack, this.css.stack1),
				stack2   : new Zone('stack2'  , Utility.cardLayout.verticalSplay, this.rules.stack, this.css.stack2),
				stack3   : new Zone('stack3'  , Utility.cardLayout.verticalSplay, this.rules.stack, this.css.stack3),
				stack4   : new Zone('stack4'  , Utility.cardLayout.verticalSplay, this.rules.stack, this.css.stack4),
				stack5   : new Zone('stack5'  , Utility.cardLayout.verticalSplay, this.rules.stack, this.css.stack5),
				stack6   : new Zone('stack6'  , Utility.cardLayout.verticalSplay, this.rules.stack, this.css.stack6),
				stack7   : new Zone('stack7'  , Utility.cardLayout.verticalSplay, this.rules.stack, this.css.stack7)
			}
		
			this.start = function()
			{
				for (var i = 0; i < deck.length; i++)
				{
					// default to foreground
					$(deck[i].getElement()).css('z-index',++summit);
					$(deck[i]).each(function(){this.flipover();});
					
					// TODO: this stuff apparently is taking time, which it should not.
					if ( i < 7 )
						self.zones.stack1.acquireCard(deck[i]);
					else if (i < 13)
						self.zones.stack2.acquireCard(deck[i]);
					else if (i < 18)
						self.zones.stack3.acquireCard(deck[i]);
					else if (i < 22)
						self.zones.stack4.acquireCard(deck[i]);
					else if (i < 25)
						self.zones.stack5.acquireCard(deck[i]);
					else if (i < 27)
						self.zones.stack6.acquireCard(deck[i]);
					else if (i < 28)
						self.zones.stack7.acquireCard(deck[i]);
					else
						self.zones.deck.acquireCard(deck[i]);
				}

				// flip over bottom cards
				self.zones.stack1.getLastCard().flipover();
				self.zones.stack2.getLastCard().flipover();
				self.zones.stack3.getLastCard().flipover();
				self.zones.stack4.getLastCard().flipover();
				self.zones.stack5.getLastCard().flipover();
				self.zones.stack6.getLastCard().flipover();
				self.zones.stack7.getLastCard().flipover();
				
				$(self.zones.deck.getElement()).click(function()
				{
					if (self.zones.deck.cards.length > 0)
					{
						var card = self.zones.deck.getLastCard();
						$(card.getElement()).css('z-index',++summit);
						self.zones.hand.acquireCard(card);
					}
				});
			}
		
		},

		golf : function()
		{
			var self = this;
			
			this.rules =
			{
				column :
				{
					play        : [Utility.cardRule.topCard]
				},
				
				stock :
				{
					play   : [Utility.cardRule.topCard]
				},
				
				foundation :
				{
					accept      : [Utility.cardRule.increment_or_decrement]
				}
			}
			
			this.css =
			{
				stock :
				{
					top  : '15em',
					left : '20em'
				},
				
				foundation :
				{
					top  : '15em',
					left : '25em'
				},
				
				column1 :
				{
					top  : '2em',
					left : '10em'
				},
				
				column2 :
				{
					top  : '2em',
					left : '15em'
				},
				
				column3 :
				{
					top  : '2em',
					left : '20em'
				},
				
				column4 :
				{
					top  : '2em',
					left : '25em'
				},
				
				column5 :
				{
					top  : '2em',
					left : '30em'
				},
				
				column6 :
				{
					top  : '2em',
					left : '35em'
				},
				
				column7 :
				{
					top  : '2em',
					left : '40em'
				}
			}
			
			this.zones =
			{
				stock      : new Zone('stock'     , Utility.cardLayout.stack,         this.rules.stock     , this.css.stock),
				foundation : new Zone('foundation', Utility.cardLayout.stack,         this.rules.foundation, this.css.foundation),
				column1    : new Zone('column1'   , Utility.cardLayout.verticalSplay, this.rules.column    , this.css.column1),
				column2    : new Zone('column2'   , Utility.cardLayout.verticalSplay, this.rules.column    , this.css.column2),
				column3    : new Zone('column3'   , Utility.cardLayout.verticalSplay, this.rules.column    , this.css.column3),
				column4    : new Zone('column4'   , Utility.cardLayout.verticalSplay, this.rules.column    , this.css.column4),
				column5    : new Zone('column5'   , Utility.cardLayout.verticalSplay, this.rules.column    , this.css.column5),
				column6    : new Zone('column6'   , Utility.cardLayout.verticalSplay, this.rules.column    , this.css.column6),
				column7    : new Zone('column7'   , Utility.cardLayout.verticalSplay, this.rules.column    , this.css.column7)
			}
			
			this.start = function()
			{
				for (var i = 0; i < deck.length; i++)
				{
					// default to foreground
					$(deck[i].getElement()).css('z-index',++summit);
					
					if ( i < 5 )
						self.zones.column1.acquireCard(deck[i]);
					else if ( i < 10 )
						self.zones.column2.acquireCard(deck[i]);
					else if ( i < 15 )
						self.zones.column3.acquireCard(deck[i]);
					else if ( i < 20 )
						self.zones.column4.acquireCard(deck[i]);
					else if ( i < 25 )
						self.zones.column5.acquireCard(deck[i]);
					else if ( i < 30 )
						self.zones.column6.acquireCard(deck[i]);
					else if ( i < 35 )
						self.zones.column7.acquireCard(deck[i]);
					else
						self.zones.stock.acquireCard(deck[i].flipover());
						
				}
				
				// deal cards on click
				$(self.zones.stock.getElement()).click(function()
				{
					if (self.zones.stock.cards.length > 0)
					{
						var card = self.zones.stock.getLastCard();
						$(card.getElement()).css('z-index',++summit);
						self.zones.foundation.acquireCard(card.flipover());
					}
				});
			}
		}
	}
}

{ /* GLOBALS */

  var summit = 0;  // highest z-index
  var player = null;
  var game   = null;
  var deck   = [];
  
  // suits
  var heart   = '\u2665'; // ♥ : &#9829
  var spade   = '\u2660'; // ♠ : &#9824
  var diamond = '\u2666'; // ♦ : &#9830
  var club    = '\u2663'; // ♣ :'&#9827

}

{ /* MAIN */

  window.onload = function()
  {
    initMeasurements();
    initPlayer();
  }
  
  initPlayer = function()
  {
    var $choice = $('<div class="choice"></div>');
    
    var $select = $('<select id="gameChooser"></select>');
    $select.append($('<option value="klondike">klondike</option>'));
    $select.append($('<option value="golf">golf</option>'));
    
    var $start = $('<button id="btnStart">Start</button>');
    $start.click(function()
    {
      initGame($('#gameChooser')[0].value);
      $choice.remove();
    });
    
    $choice.append($select);
    $choice.append($start);    
    
    $('#content').append($choice);
  }
  
  initGame = function(type)
  {

    switch(type)
    {
      case 'klondike':
        game = new patience.klondike();
        break;
      case 'golf':
        game = new patience.golf();
        break;
      default:
        return;
    }
    
    initZones();
    initDeck();
    game.start();
    initActions();
  }
  
  initMeasurements = function()
  {
    // create a temporary card to determine its size
    var card = new Card(2, 'X');    
    $('#content').append(card.getElement());
    
    // set global dimensions of Card for reference
    Card.dimensions = { height:$(card.getElement()).height(), width:$(card.getElement()).width() };
    
    // and clean up
    $('#content')[0].removeChild(card.getElement());
  }
  
  initZones = function()
  {
    for (var key in game.zones)
    {
      $('#content').append(game.zones[key].getElement());
    }
  }

  initDeck = function()
  {
    
    // prepare deck
    for (var rank = 1; rank < 14; rank++) deck.push(new Card(rank, heart));
    for (var rank = 1; rank < 14; rank++) deck.push(new Card(rank, spade));
    for (var rank = 1; rank < 14; rank++) deck.push(new Card(rank, diamond));
    for (var rank = 1; rank < 14; rank++) deck.push(new Card(rank, club));
    
    // shuffle
    deck = Utility.shuffle(deck);
  }

  // TODO: maybe make a list of common action settings
  initActions = function()
  {

    // Allow cards to be grabbed and moved...unless they are facedown
    $('.card').draggable(
    {
      start   : function(){this.object.rise();},
      stop    : function(){this.object.fall();}, // NOTE: this happens after acquireCard, which can mess up z-index
      opacity : 0.5,
      revert  : 'invalid',
      // prevent dragging from starting on designated elements
      cancel  : '.facedown'
      // disable...
    });
    
    // Allow zones to have cards dropped on them.
    $('.zone').droppable(
    {
      accept    : function(event, data)
      {
        if (typeof(data) === 'undefined')
        {
          data = {zone:this.object, card:event[0].object};
        }
        
        return data.zone.checkRule('accept', data);
      },
      tolerance : 'pointer',
      drop      : function(event, ui)
      {
        ui.draggable.removeClass('draggedOverZone');
        this.object.acquireCard(ui.draggable[0].object);
      },
      over      : function( event, ui )
      {
        ui.draggable.addClass('draggedOverZone');
      },
      out       : function( event, ui )
      {
        ui.draggable.removeClass('draggedOverZone');
      }
    });
    
    // auto-play cards on double-click
    // NOTE: this will move a card to the first zone that will accept it
    $('.card').dblclick(function(event)
    {
      var card = this.object;

      // NOTE: this works because zones is created without a prototype
      for (var zone in game.zones)
      {
        var data = {zone:game.zones[zone], card:card};
        
        if (data.zone.checkRule('doubleclick', data))
        {
          data.zone.acquireCard(card);
          break;
        }
      }
    });
  }

}