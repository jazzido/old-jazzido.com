var ProfileDataPresenter = new Class({
    initialize: function(element) {
	this.element = element;
	this.children = element.getChildren();
	this.linksArea = this.children[0]; this.contentArea = this.children[1];
	this.contentArea.addEvent('click', function(e) { e.stopPropagation(); });
	this.open = false;
    },
    show: function() {
	this.contentArea.set('html', '<img src="images/ajax-loader.gif" style="display: block; margin: 0 auto; margin-top: 66px;">');
	this.children.each(function(e) {
	    e.morph({marginLeft: -200});
	}.bind(this));
	this.open = true;
    },
    hide: function() {
	this.children.each(function(e) {
	    e.morph({marginLeft: 0});
	}.bind(this));
	this.open = false;
    },
    morphHandlers: {
	showStart: function() {
	    this.prevButton.disabled = true;
	    this.nextButton.disabled = true;
	},
	showNextComplete: function() {
	    this.prevButton.disabled = false;
	    this.nextButton.disabled = (this.currentElementIndex + 2 == this.elementCount);
	    this.currentElementIndex++;
	},
	showPrevComplete: function() {
 	    this.nextButton.disabled = false;
	    this.prevButton.disabled = (this.currentElementIndex - 1 == 0);
	    this.currentElementIndex--;
	}
    },
    showNext: function(e) {
	var ul = this.contentArea.getElement('ul');
	var morph = new Fx.Morph(ul,
	                        {
				    onStart: this.morphHandlers.showStart.bind(this),
				    onComplete: this.morphHandlers.showNextComplete.bind(this)
				});
	morph.start({'margin-top': parseInt(ul.getStyle('margin-top')) - 200});
    },
    showPrev: function(e) {
	var ul = this.contentArea.getElement('ul');
	var morph = new Fx.Morph(ul,
	    {
		onStart: this.morphHandlers.showStart.bind(this),
		onComplete: this.morphHandlers.showPrevComplete.bind(this)
	    });

	morph.start({'margin-top': parseInt(ul.getStyle('margin-top')) + 200});
    },
    showData: function(html) {
	this.currentElementIndex = 0;
	Elements.from(html).inject(this.contentArea, 'top');
    },
    showProfileName: function(name, link) {
	var t= '<span id="profileService">from <a href="{link}" target="_blank">{name}</a></span>';
	var els = Elements.from(t.substitute({name: name, link: link}));
	els.inject(this.contentArea);
    },
    showButtons: function() {
	// create buttons
	this.buttons = Elements.from('<span style="visibility: hidden" id="profileButtons"> \
                                        <button id="profileUp">↑</button>\
                                        <button id="profileDown">↓</button>\
                                        <button id="profileBack">←</button>\
                                      </span>')[0];

	(this.prevButton = this.buttons.getChildren()[0]).addEvent('click', this.showPrev.bind(this));
	(this.nextButton = this.buttons.getChildren()[1]).addEvent('click', this.showNext.bind(this));
	(this.hideButton = this.buttons.getChildren()[2]).addEvent('click', this.hide.bind(this));

	this.buttons.inject(this.contentArea, 'bottom'); 
	this.buttons.setStyle('visibility', 'visible');

	this.prevButton.disabled = true;

    },
    verticalCenter: function(selector){
	// fuck you css and your lack of easy vertical centering
	this.contentArea.getElements(selector).each(function(li) {
	    var f = li.getFirst();
	    f.setStyle('top', (li.getSize().y / 2) - (f.getSize().y / 2));
	})
    }
});


var ProfileDataManager = new Class({
    initialize: function() {
	this.fetchers = {
	    twitter: new ProfileDataFetcher('twitter',
					    'http://twitter.com/statuses/user_timeline/manuelaristaran.json',
					    { count: 20 },
					    { 
						onComplete: function(e) { 
						    var url_match = /(https?:\/\/([-\w\.]+)+(:\d+)?(\/([\w/_\.-]*(\?\S+)?)?)?)/g;
						    var h = '<ul id="twitter">';
						    var liTmpl = '<li><blockquote>« {twitt} » <a href="http://twitter.com/manuelaristaran/status/{id}" target="_blank">#</a></blockquote></li>';
						    e.data.each(function(t) { 
							var text = t.text.replace(url_match, '<a target="_blank" href="$1">$1</a>');
							text = text.replace(/@([A-Za-z0-9]+)/g, '<a target="_blank" href="http://twitter.com/$1">@$1</a>');
							h += liTmpl.substitute({twitt: text, id: t.id });
						    });
						    h += '</ul>';
						    this.dataPresenter.elementCount = e.data.length;
						    this.dataPresenter.showData(h);
						    this.dataPresenter.showProfileName('Twitter', 'http://twitter.com/manuelaristaran');
						    this.dataPresenter.showButtons();
						    this.dataPresenter.verticalCenter('li');
						}.bind(this)
					    }
					   ),
	    flickr: new ProfileDataFetcher('flickr',
					   'http://www.flickr.com/services/rest/',
					   { user_id: '15234225@N00',
					     format: 'json',
					     api_key: 'd8a9454f1a9f1bef9ccdf4d435794df8',
					     per_page: 50,
					     method: 'flickr.people.getPublicPhotos' },
					   { 
					       onComplete: function(e) { 

						   var urlTmpl = 'http://farm{farm}.static.flickr.com/{server}/{id}_{secret}_m.jpg';
						   var liTmpl = '<li><a target="_blank" href="http://flickr.com/photos/jazzido/{photo_id}"><img src="{img_src}"  /></a></li>';
						   var h = '<ul id="flickr">';
						   e.data.photos.photo.each(function(t) { 
						       h += liTmpl.substitute({photo_id: t.id,
									      img_src: urlTmpl.substitute({farm: t.farm, 
													   server: t.server, 
													   id: t.id, 
													   secret: t.secret})
									      });
						   });
						   h += '</ul>';
						   this.dataPresenter.elementCount = e.data.photos.photo.length;
						   this.dataPresenter.showData(h);
						   this.dataPresenter.showProfileName('Flickr', 'http://flickr.com/photos/jazzido');
						   this.dataPresenter.showButtons();
					       }.bind(this),
					       callbackKey: 'jsoncallback'
					   }),
	    blog: new ProfileDataFetcher('blog',
					 'http://blog.jazzido.com/feed/atom/',
					 { feed: 'json' },
					 { 
					     callbackKey: 'jsonp',
					     onComplete: function(e) { 
						 var presenter = this.dataPresenter;
						 var postTmpl = '<li><div><a href="{url}" target="_blank">{title}</a><br>Written on: <span>{date}</span></div></li>';

						 var h = '<ul id="blog">';
						 e.data.each(function(t) { 
						     h += postTmpl.substitute({url: t.permalink,
									       title: t.title,
									       date: t.date
									      });
						 });
						 h += '</ul>';
						 this.dataPresenter.elementCount = e.data.length;
						 this.dataPresenter.showData(h);
						 this.dataPresenter.showProfileName('Blog', 'http://blog.jazzido.com/');
						 this.dataPresenter.showButtons();
						 this.dataPresenter.verticalCenter('li');
					     }.bind(this)
					 }),
	    delicious: new ProfileDataFetcher('delicious',
					      'http://feeds.delicious.com/v2/json/jazzido',
					      { count: 50 },
					      { 
						  onComplete: function(e) { 
						      var presenter = this.dataPresenter;
						      var linkTmpl = '<li><div><a href="{url}" target="_blank">{name}</a><br>{tags}</div></li>';
						      var tagTmpl = '<a class="tag" href="http://delicious.com/jazzido/{tag}" target="_blank">{tag}</a>';
						      var h = '<ul id="delicious">';
						      e.data.each(function(t) { 
								      h += linkTmpl.substitute({url: t.u,
												name: t.d,
												tags: t.t.map(function(tag) {
														return tagTmpl.substitute({tag: tag});
													      }).join(' + ')
												    
											       });
								  });
						      h += '</ul>';
						      this.dataPresenter.elementCount = e.data.length;
						      this.dataPresenter.showData(h);
						      this.dataPresenter.showProfileName('Delicious', 'http://delicious.com/jazzido');
						      this.dataPresenter.showButtons();
						      this.dataPresenter.verticalCenter('li');
						  }.bind(this)
					      }),
	    lastfm: new ProfileDataFetcher('lastfm',
					   'http://pipes.yahoo.com/pipes/pipe.run',
					   { _id: '90c22d20f77e336daf26dd3599c65a37',
					     _render: 'json' },
					   { 
					       onComplete: function(e) { 
						   var trackTmpl = '<li><div><a target="_blank" href="{link}">{name}</a> <span>({artist})</span></div></li>';
						   var h = '<ul id="lastfm">';
						   e.data.value.items.each(function(i) {
									       h += trackTmpl.substitute({
													     link: i.url,
													     name: i.name,
													     artist: i.artist.content
													 }
										   
									       );
									   });
						   h += "</ul>";
						   this.dataPresenter.elementCount = e.data.value.items.length;
						   this.dataPresenter.showData(h);
						   this.dataPresenter.showProfileName('Last.FM', 'http://last.fm/user/maristaran');
						   this.dataPresenter.showButtons();
						   this.dataPresenter.verticalCenter('li');
					       }.bind(this),
					       callbackKey: '_callback'
					   }),
	    youtube: new ProfileDataFetcher('youtube',
					    'http://gdata.youtube.com/feeds/users/jazzido/uploads',
					    { alt: 'json-in-script' },
					    { 
						onComplete: function(e) { 
						    var h = '<ul id="youtube">';
						    var linkTmpl = '<li><a title="{title}" href="{link}" target="_blank"><img height="135" width="180" src="{thumb}"><img src="images/playicon.png" class="playicon"></a></li>';
						    e.data.feed.entry.each(function(t) { 
									       h += linkTmpl.substitute({ link: t.link[0].href,
													  thumb: t.media$group.media$thumbnail[3].url,
													  title: t.title.$t
													   
												       }); 
									   });
						    h += '</ul>';
						    this.dataPresenter.elementCount = e.data.feed.entry.length;
						    this.dataPresenter.showData(h);
						    this.dataPresenter.showProfileName('YouTube', 'http://youtube.com/jazzido');
						    this.dataPresenter.showButtons();
						}.bind(this)
					    }),
	    googlereader: new ProfileDataFetcher('googlereader',
						 'http://www.google.com/reader/public/javascript/user/09760440558913903344/state/com.google/broadcast',
						 { n: 5 },
						 { 
						     onComplete: function(e) { 
							 var presenter = this.dataPresenter;
							 var linkTmpl = '<li><div><a href="{url}" target="_blank">{title}</a><br>From <a href="{source_url}" target="_blank">{source_name}</a> on {date}</div></li>';
							 var h = '<ul id="googlereader">';
							 e.data.items.each(function(t) { 
							     h += linkTmpl.substitute({url: t.alternate.href,
										       title: t.title,
										       source_name: t.origin.title,
										       source_url: t.origin.htmlUrl,
										       date: new Date(t.updated * 1000).format('%B %d, %Y')
										      });
							 });
							 h += '</ul>';
							 this.dataPresenter.elementCount = e.data.items.length;
							 this.dataPresenter.showData(h);
							 this.dataPresenter.showProfileName('Reader', 'http://www.google.com/reader/shared/maristaran');
							 this.dataPresenter.showButtons();
							 this.dataPresenter.verticalCenter('li');
						     }.bind(this)
						 })
						 
	};
    },
    fetch: function(serviceId) {
	if (serviceId in this.fetchers)
	    this.fetchers[serviceId].fetch();
    }
});

var ProfileDataFetcher = new Class({
    Implements: [Options, Events],
    initialize: function(fetcherId, url, data, options) {
	this.setOptions(options);
	this.fetcherId = fetcherId;
	//this.cache = null;
	this.req = new Request.JSONP({
	    url: url,
	    data: data,
	    callbackKey: this.options.callbackKey || 'callback',
	    onSuccess: function(data) { 
		//this.cache = { target: this, data: data };
		this.fireEvent('onComplete', { target: this, data: data }); 
	    }.bind(this)
	});
    },
    fetch: function() {
	this.req.send();
    }
});
