// Puzzfolio
// Copyright (C) 2008-2009 Manuel Aristaran http://jazzido.com
// Like the code? Hire me then!

Array.implement({
    insert: function(v, i) {
	if (i >= 0) {
	    var a = $A(this);
	    var b = a.splice(i);
	    a[i] = v;
	    a = a.concat(b);
	    return a;
	}
    }

});


var invD = function(direction) {
    return {'right': 'left',
	    'left': 'right',
	    'up': 'down',
	    'down': 'up'}[direction];
};



var Board = new Class({
    Extends: Array,
    initialize: function(size) {
	this.size = size;
	this.boardSide = Math.sqrt(size);
	for(i = 0; i < this.boardSide; i++) this.push([]);
    },
    flip: function(ai, aj, bi, bj) {
	var tmp = this[ai][aj];
	this[ai][aj] = this[bi][bj];
	this[bi][bj] = tmp;
    },
    freeNeighbor: function(piece) {
	var i = piece.position.i; var j = piece.position.j;
	if(j < this.boardSide-1 && !$defined(this[i][j+1])) return 'right'; 
	if(j > 0 && !$defined(this[i][j-1])) return 'left';
	if(i < this.boardSide-1 && !$defined(this[i+1][j])) return 'down';
	if(i > 0 && !$defined(this[i-1][j])) return 'up'; 
	return null;
    },
    findEmptySquare: function() {
	var ni, nj;
	// find empty square
 	for(ni = 0; ni < this.boardSide; ni++) {
 	    nj = this[ni].indexOf(null);
	    if (nj != -1) break;
 	}
	return {'i': ni, 'j': nj };
    },
    getNeighbor: function(i,j,direction) {
	var rv = { 'i': i, 'j': j };
	switch(direction) {
	case 'up':
	    rv.i--;
	    break;
	case 'down':
	    rv.i++;
	    break;
	case 'right':
	    rv.j++;
	    break;
	case 'left':
	    rv.j--;
	    break;
	}
	return rv.i > this.boardSide-1 || rv.j > this.boardSide-1 || rv.i < 0 || rv.j < 0 ? null : rv;
    }
});

var PuzzfolioPiece = new Class({
    Implements: [Events, Options],
    options: {
	moveDuration: 300
    },
    initialize: function() {
	this.element = $(this.elementID);//$(piece);

	this.pieceId = this.element.id;

	this.height = this.element.getSize().y;
	
	this.fx = new Fx.Tween(this.element, 
			       { 'onComplete': function() { 
				   this.fireEvent('movecomplete', this); 
			       }.bind(this),
			       'duration': this.options.moveDuration }); 

	this.currentPosition = { 'x': this.position.j*this.height, 'y': this.position.i*this.height }
	this.element.setStyles({ 'top': this.currentPosition.y, 
				 'left': this.currentPosition.x });
	
	this.element.addEvent('click', this._clickHandler.bind(this));
	
    },
    _clickHandler: function(e) {
	this.fireEvent('click', this);
    },
    move: function(direction) {
	switch(direction) {
	case 'up':
	    this.fx.start('top', this.currentPosition.y = this.currentPosition.y - this.height );
	    break;
	case 'down':
	    this.fx.start('top', this.currentPosition.y = this.currentPosition.y + this.height );
	    break;
	case 'right':
            this.fx.start('left', this.currentPosition.x = this.currentPosition.x + this.height );
	    break;
	case 'left':
	    this.fx.start('left', this.currentPosition.x = this.currentPosition.x - this.height );
	    break;
	}
    },
    zIndex: function() {
	return this.element.getStyle('z-index');
    },
    onOpened: $empty,
    onClosing: $empty
});

var Puzzfolio = new Class({
    Implements: [Options, Events],
    options: {
	size: 9, // square number
	pieceMoveDuration: 300 // msecs
    },
    initialize: function(element, pieces, options) {
	this.element = $(element);
	this.pieces = pieces;
	this.setOptions(options);

	this.curZindex = 42;
	
	this.board = new Board(this.options.size); 
	this.movesChain = new Chain;
	this.openPiece = null;
	this._initPieces();

	this._canMove = true;
    },
    _initPieces: function() {
	var idx = 0;
	this.pieces.each(function(v, k) {
	    var p = new v();
 
	    if (!this.board[p.position.i]) this.board[p.position.i] = [];
	    this.board[p.position.i][p.position.j] = p;

	    p.element.setStyle('z-index', (p.position.i * this.board.boardSide + p.position.j));
	    
	    p.addEvent('click', this._pieceClickHandler.bind(this));
	    p.addEvent('movecomplete', function() { this.movesChain.callChain() }.bind(this));

	}.bind(this));
 	this.board[this.board.boardSide-1][this.board.boardSide - 1] = null;
    },
    _chainMoves: function(moves) {
	this.movesChain.chain(moves.map(function(m) {
	    return function() {
		var e = this.board.findEmptySquare();
		var n = this.board.getNeighbor(e.i, e.j, m);
		var p = this.board[n.i][n.j];
		p.element.setStyle('z-index', this.curZindex += 10);

		var direction = this.board.freeNeighbor(p);
		
		// adjust stacking for pieces in 2nd column moving up or down
 		if ((direction == 'up' || direction == 'down') && p.position.j == 1) {
 		    var targeti = p.position.i + (direction == 'up' ? -1 : 1);
 		    p.element.setStyle('z-index', this.board[targeti][2].zIndex - 1);
 		}
		
		p.move(direction);
		p.position = e;
		this.board.flip(n.i, n.j, e.i, e.j);
	    }.bind(this);
	}, this));
    },
    _pieceClickHandler: function(piece) {
 	if (!this._canMove) {
 	    return;
 	}
	  
	this.movesChain.clearChain();
        var moves = [];


	// backtrack
	if (this.openPiece) {
	    //moves = $A(this.options.moves[this.openPiece.pieceId]).reverse().map(invD);
	    moves = $A(this.openPiece.moves).reverse().map(invD);
	    
	    // click on the openPiece. Close the thang and flee.
	    if (this.openPiece == piece) {
		this._chainMoves(moves);
		this._canMove = false;
		this.fireEvent('moveStart', this);
		this.openPiece.onClosing();
		(function() { this._canMove = true;
			      this.fireEvent('moveEnd', this) }).bind(this).delay(moves.length * this.options.pieceMoveDuration);
		this.movesChain.callChain();
		this.openPiece = null;
		
		return;
	    }
	}

        piece.moves.each(function(m) {
            if (moves.getLast() == invD(m)) {
                moves.pop();
                return;
            }
            moves.push(m);
        });

	this._chainMoves(moves);
	this._canMove = false;
	this.fireEvent('moveStart', this);
	if (this.openPiece) this.openPiece.onClosing();
	(function() { 
	    this._canMove = true; 
	    this.fireEvent('moveEnd', this);
	    piece.onOpened();
	}).bind(this).delay(moves.length * this.options.pieceMoveDuration);
	
	this.movesChain.callChain();
	this.openPiece = piece;
   }
});

var _pieces = new Hash({
    'tileProjects': new Class({
	Extends: PuzzfolioPiece,
	moves: ['up', 'up', 'left'],
	elementID: 'tileProjects',
	position: {i: 0, j: 0},
	initialize: function() {
	    this.parent();

	    this.projectList = this.element.getElement('dl');
	    this.header = this.element.getElement('h2');

	    this.projectView = false;
	    
	    this.element.getElements('dt').addEvent('click', this._projectClickHandler.bind(this));
	    
	    this.header.addEvent('click', this._headerClick.bind(this));
	    
	    this.containerDiv = new Element('div', { id: 'containerDiv' });
	    this.containerDiv.wraps(this.projectList);
	    
	    this.projectDescription = new Element('div', {id: 'projectDescription'});
	    this.projectDescription.inject(this.containerDiv);

	    this.backButton = new Element('button', {html: '←', style: 'visibility: hidden' });
 	    this.backButton.inject(this.element);
	    this.backButton.addEvent('click', this._headerClick.bind(this));


	    this.projectDescription.addEvent('click:relay(a)', function(e) { 
		e.preventDefault(); 
		e.stopPropagation(); 
		window.open(e.target.href, '_blank');
	    });

	    this.fxSlideIn    = new Fx.Morph(this.header);
 	    this.fxSlideOut   = new Fx.Morph(this.header);
	    this.fxSlideUp    = new Fx.Morph(this.projectList);
	    this.fxSlideDown  = new Fx.Morph(this.projectList);

	    this.slideIn = function() { this.fxSlideIn.start({marginLeft: -700 }) }.bind(this);
	    this.slideOut = function() { this.fxSlideOut.start({marginLeft: 0 }) }.bind(this);
	    this.slideUp = function() { this.fxSlideUp.start({marginTop: -150 }) }.bind(this);
	    this.slideDown = function() { this.fxSlideDown.start({marginTop: 0 }) }.bind(this);
	    
	},
	slidIn: function(text) {
	    this.header.set('html', text);
	    this.fxSlideIn.removeEvents();
	    this.slideOut();
	},
	_projectClickHandler: function(e) {
	    e.stopPropagation();

	    if (e.target.hasClass('selected')) return;

	    var dt;
	    if (dt = this.element.getElement('.selected')) 
		dt.removeClass('selected')
	    e.target.addClass('selected');

	    this.fxSlideIn.addEvent('complete', 
				  function() { 
				      this.detailView = true; 
				      this.slidIn(e.target.get('html').replace(/\s/g, '')) 
				  }.bind(this));

	    this.projectDescription.set('html', e.target.getNext('dd').get('html'));

	    this.backButton.setStyle.delay(1000, this.backButton, ['visibility', 'visible']);

	    this.slideUp();
	    this.slideIn();
	},
	_headerClick: function(e) {
	    if (!this.open) return;
	    if (e) e.stopPropagation();
	    if (this.detailView) {
		this.fxSlideIn.addEvent('complete', 
				      function() { 
					  this.detailView = false; 
					  this.slidIn('PROJECTS'); 
				      }.bind(this));
		this.fxSlideOut.addEvent('complete', 
					  function() { 
					      this.element.getElement('.selected').removeClass('selected');
					      this.fxSlideOut.removeEvents();
					  }.bind(this));

		this.backButton.setStyle('visibility', 'hidden');
		this.slideIn();
		this.slideDown();
		this.detailView = false;
	    }
	},
	onOpened: function() {
	    this.open = true;
	    this.projectList.setStyle('visibility', 'visible');
	},
	onClosing: function() {
	    if (this.detailView) {
	    	this.fxSlideIn.addEvent('complete', 
	    			      function() { 
	    				  this.detailView = false;
	    				  this.projectList.setStyle('visibility', 'hidden');
	    				  this.containerDiv.setStyle('visibility', 'hidden');
	    				  this.projectList.setStyle('margin-top', 0);
	    				  this.containerDiv.setStyle('visibility', 'visible');
					  this.backButton.setStyle('visibility', 'hidden');
	    				  this.slidIn('PROJECTS'); 
	    			      }.bind(this));
	    	this.slideIn();
	    }
	    else {
		this.projectList.setStyle('visibility', 'hidden');
	    }
	    this.open = false;
	}
	
    }),
    'tileGame': new Class({
	Extends: PuzzfolioPiece,	
	elementID: 'tileGame',
	moves: ['up', 'left', 'up', 'right'],
	position: {i: 0, j: 2},
	onOpened: function() {
	    startLife();
	}
    }),
    'tileLinks': new Class({
	Extends: PuzzfolioPiece,
	moves: ['up', 'left'],
	elementID: 'tileLinks',
	position: {i: 1, j: 0},
	initialize: function() {
	    this.parent();
	    var sc = new Element('div', {id: 'slidingContainer'});
	    this.element.getElement('p').inject(sc);
	    this.element.grab(sc);
	    (new Element('div', {id: 'linksDataContainer'})).inject(sc);
	    this.dataManager = new ProfileDataManager();
	    this.dataManager.dataPresenter = new ProfileDataPresenter(this.element.getElement('#slidingContainer'));
	    this.element.getElements('a').addEvent('click', this._linkClickHandler.bind(this));
	},
	_linkClickHandler: function(e) {
	    e.stopPropagation();
	    e.preventDefault();
	    if($(e.target).hasClass('presenter-link')) {
		this.dataManager.fetch(e.target.get('name'));
		this.dataManager.dataPresenter.show();
	    }
	    else {
		window.open(e.target.href, '_blank');
	    }
	},
	onOpened: function() {
	},
	onClosing: function() {
	    this.dataManager.dataPresenter.hide();
	}
    }),
    'tileTechnologies': new Class({
	Extends: PuzzfolioPiece,
	moves: ['left', 'up', 'right'],
	elementID: 'tileTechnologies',
	position: {i: 1, j: 2},
	onOpened: function() {
	    if (this.opened) return;
	    this.opened = true;
	    var cursor = '<span id="cursor">|</span>';
	    var p = this.element.getElement('p');
	    var text = p.get('html');
	    var typeIndex = 0;
	    var typeSpeed = 90;
	    var typo = 0;
	    var chars = "abcdefghiklmnopqrstuvwxyz";

	    var typist;

	    p.set('html', '');
	    p.setStyle('visibility', 'visible');
	    
	    // ZOMFGBBQ!!!!1 An algorithmic model of an imperfect typist!
	    var typeChar = function() {
		if ($random(0,60) == 42) { // typo 
		    p.set('html', text.substring(0, typeIndex) + chars[$random(0, chars.length-1)] + cursor);
		    typo++;
		    typist = typeChar.delay(typeSpeed + 250);
		}
		else if (typo > 0) {
		    p.set('html', text.substring(0, typeIndex-typo+1) + cursor);
		    typo--;
		    typist = typeChar.delay(typeSpeed + 250);
		}
		else {
		    p.set('html', text.substring(0, typeIndex++) + cursor);
		    typist = typeChar.delay(typeSpeed + $random(-50, 70));
		}
		if (typeIndex > text.length) { 
		    $clear(typist);
		    p.getElement('span').setStyle('text-decoration', 'blink');
		}
	    };
	    typeChar();
	}
    }),
    'tileMoreProjects': new Class({
	Extends: PuzzfolioPiece,
	moves: ['up', 'up'],
	elementID: 'tileMoreProjects',
	position: {i: 0, j: 1},
	initialize: function() {
	    this.parent();
	    this.slide = new Fx.Morph(this.element.getElement('dl'), {duration: 300});
	    this.element.getElements('a').addEvent('click', function(e) { e.stopPropagation();  });
	},
	onOpened: function() {
	    this.slide.start({ marginTop: 35 });
	},
	onClosing: function() {
	    this.slide.start({ marginTop: -95 });
	}
    }),
    'tileContact': new Class({
	Extends: PuzzfolioPiece,
	moves: ['up'],
	position: {i: 1, j: 1},
	elementID: 'tileContact',
	initialize: function() {
	    this.parent();

	    this.contactContainer = new Element('div', {id: 'contactContainer'});
	    this.contactContainer.adopt('contactData', 'contactForm');

	    this.contactContainer.inject(this.element);

	    this.element.getElement('div#contactContainer').addEvent('click', function(e) {
		e.stopPropagation();
	    });

	    $('contact-form-anchor').addEvent('click', function(e) {
		e.preventDefault();
		this.contactContainer.morph({marginTop: -200});
	    }.bind(this));

	    $('formHide').addEvent('click', function(e) {
		e.preventDefault();
		this.contactContainer.morph({marginTop: 0});
	    }.bind(this));

	    $('contactForm').addEvent('submit', this.formSubmit.bind(this));

	},
	onClosing: function() {
	    this.contactContainer.morph({marginTop: 0});
	},
	blink: function(element) {
	    element = $(element);
	    var eB = element.getStyle('background-color');
	    var b = function(e, b) { e.setStyle('background-color', b) };
	    for (i = 0; i < 6; i++) {
		b.delay(i * 250, this, [element, i % 2 ? eB : '#ff8']);
	    }
	},
	formSubmit: function(e) {
	    e.stop();

	    var valid = true;

	    // validate
	    if (!/^([a-zA-Z0-9_.-])+@(([a-zA-Z0-9-])+.)+([a-zA-Z0-9]{2,4})+$/.test($('inputEmail').get('value'))) {
		this.blink($('inputEmail'));
		valid = false;
	    }
	    
	    if ($('inputMessage').get('value') == '') {
		this.blink($('inputMessage'));
		valid = false;
	    }

	    if ($('inputName').get('value') == '') {
		this.blink($('inputName'));
		valid = false;
	    }

	    if (!valid) return;


	    var b = $('inputSubmit');
	    b.set('html', 'Sending...');
	    $(e.target).set('send', { url: $(e.target).get('action'),
				      method: 'POST',
				      onComplete: function() {
					  var but = this.element.getElement('button[type=submit]').set('html', 'Sent!');
					  this.element.getElements('input, textarea, button[type=submit]').each(function(i) {
					      (function(h) { 
						  h.disabled = false;
						  h.set('value', '');
					      }).delay(2000, this, i);
					  });
					  (function(h) { h.set('html', 'Send') }).delay(2000, this, but);
				      }.bind(this)
				    });
	    $(e.target).send();
	    this.element.getElements('input, textarea, button[type=submit]').each(function(i) { i.disabled = true; });
		
	}
    }),
    'tileAboutMe': new Class({
	Extends: PuzzfolioPiece,
	moves: ['left'],
	position: {i: 2, j: 0},
	elementID: 'tileAboutMe',
	initialize: function() {
	    this.parent();
	    this.element.getElement('h2').set('html', 'ABOUT <span>ME</span>');
	    this.me = this.element.getElement('span');
	    this.me.set('morph', {duration: 300});
	    var ps = this.element.getElements('p');
	    (this.p1 = ps[0]).setStyle('margin-top', -79);
	    this.p1.set('morph', {duration: 300});
	    (this.p2 = ps[1]).setStyle('margin-top', 93);
	    this.p2.set('morph', {duration: 300});
	    
	},
	onOpened: function() {
	    this.me.morph({left: 136});
	    this.p1.morph({marginTop: 0});
	    this.p2.morph({marginTop: 0});
	},
	onClosing: function() {
	    this.me.morph({left: 0});
	    this.p1.morph({marginTop: -79});
	    this.p2.morph({marginTop: 93});
	}

    }),
    'tileMyName': new Class({
	Extends: PuzzfolioPiece,
	moves: [],
	position: {i: 2, j: 1},
	elementID: 'tileMyName'
    })
});


window.addEvent('domready', function() {
    new Puzzfolio($('puzzfolio'), _pieces);
    $('puzzfolio').setStyle('visibility', 'visible');
});
