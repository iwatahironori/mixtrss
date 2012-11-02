var BASE_URL = document.location.protocol + '//' + document.location.host;

// Use {{ mustache }} template delimiters to avoid ERB conflicts
_.templateSettings = { interpolate : /\{\{([\s\S]+?)\}\}/g };

Backbone.Application = function(attributes) {
    application = {
        // Singular, Capital Namespaces for class declarations
        Model: {}, View: {}, Collection: {},
        // plural, lowercase namespaces for instances
        models: {}, views: {}, collections: {},
        // global event dispatcher
        dispatcher: _.clone(Backbone.Events)
    };
    for (var property in attributes) {
        if (attributes.hasOwnProperty(property)) {
            application[property] = attributes[property];
        }
    }
    return application;
};

var Mixtress = new Backbone.Application({
    initialize: function() {
        Mixtress.Router = Backbone.Router.extend({
            routes: {
                '': 'home',
                '/': 'home',
                ':genre/:page': 'mixes',
                '*path': 'unknown'
            },
            home: function() {
                console.log("CALLED INDEX");
                // default the user to the first page of the "all" genre
                Mixtress.router.navigate('/all/0', true);
            },
            mixes: function(genre, page) {
                console.log("MIXES CALLED:", genre, page);

                Mixtress.views.navigationView = new Mixtress.View.NavigationView({genre: genre});
                Mixtress.views.navigationView.render();

                Mixtress.views.paginationView = new Mixtress.View.PaginationView({genre: genre, page: page});
                Mixtress.views.paginationView.render();

                Mixtress.collections.mixes = new Mixtress.Collection.Mixes([], {genre: genre, page: page});
                Mixtress.views.mixesView = new Mixtress.View.MixesView({collection: Mixtress.collections.mixes});
                Mixtress.collections.mixes.fetch({success: function() {
                    Mixtress.views.mixesView.render();
                }});

                _gaq.push(['_trackPageview', Backbone.history.fragment]);
            },
            unknown: function(path) {
                console.log("CALLED UNKNOWN");
                console.log('ACTION is:', path);
                console.log(window.location.pathname);
            }
        });
        // Instantiate router
        Mixtress.router = new Mixtress.Router();
        Backbone.history.start();

        // Bind all the links whose hrefs start with a / to call internal navigation
        $(document).on('click', "a[href^='/']", function(event) {
            if(!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
                event.preventDefault();
                var url = $(event.currentTarget).attr("href").replace(/^\//, "");
                Mixtress.router.navigate(url, true);
            }
        });
    }
});

Mixtress.Model.Mix = Backbone.Model.extend({
    defaults: {
        uri: '',
        score: 0
    }
});

Mixtress.Collection.Mixes = Backbone.Collection.extend({
    model: Mixtress.Model.Mix,
    initialize: function(models, options) {
        this.genre = options.genre;
        this.page = options.page;
    },
    url: function() {
        return BASE_URL + '/mixes/' + this.genre + '/' + this.page;
    }
});

Mixtress.View.MixView = Backbone.View.extend({
    tagName: 'li',
    className: 'mix',
    template: _.template($('#mix-template').html()),
    initialize: function() {
    },
    render: function() {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    }
});

Mixtress.View.MixesView = Backbone.View.extend({
    el: "#container",
    template: _.template($('#mixes-template').html()),
    initialize: function() {
        _.bindAll(this, 'render');
        this.collection.bind('reset', this.render);
    },
    render: function() {
        var collection = this.collection;
        this.$('iframe').remove(); // clear out all the iframes for good measure
        this.$el.html(this.template({}));

        if(collection.length) {
            var $mixes = this.$('.mixes');
            collection.each(function(mix, i) {
                var view = new Mixtress.View.MixView({
                    model: mix,
                    collection: collection
                });
                $mixes.append(view.render().el);
            });
        } else {
            this.$el.html(_.template($('#empty-mixes-template').html()));
        }
        return this;
    }
});

Mixtress.View.NavigationView = Backbone.View.extend({
    el: '#navigation',
    template: _.template($('#navigation-template').html()),
    initialize: function(options) {
        _.bindAll(this, 'render');
        this.selectedGenre = options.genre;
    },
    render: function() {
        var that = this;
        this.$el.empty().html(this.template({}));

        var $genres = this.$('.genres');
        _(AVAILABLE_GENRES).each(function(genre, i) {
            var view = new Mixtress.View.NavigationEntryView({
                genre: genre,
                isLast: (i == AVAILABLE_GENRES.length - 1),
                isSelected: (that.selectedGenre == genre)
            });

            $genres.append(view.render().el);
        });

        return this;
    }
});

Mixtress.View.NavigationEntryView = Backbone.View.extend({
    tagName: 'li',
    className: 'genre',
    template: _.template($('#navigation-entry-template').html()),
    initialize: function(options) {
        _.bindAll(this, 'render');
        this.genre = options.genre;
        this.isLast = options.isLast;
        this.isSelected = options.isSelected;
    },
    render: function() {
        var title = this.genre.charAt(0).toUpperCase() + this.genre.substring(1).toLowerCase();
        var separator = this.isLast ? "" : "/";
        var classes = this.isSelected ? "selected" : "";
        this.$el.html(this.template({
            genre: this.genre,
            title: title,
            separator: separator,
            classes: classes
        }));
        return this;
    }
});

Mixtress.View.PaginationView = Backbone.View.extend({
    el: "#pagination",
    template: _.template($('#pagination-template').html()),
    events: {
        'click a': 'navigate'
    },
    initialize: function(options) {
        _.bindAll(this, 'render');
        this.selectedGenre = options.genre;
        this.selectedPage = parseInt(options.page);
    },
    render: function() {
        this.$el.empty().html(this.template({
            genre: this.selectedGenre,
            previousPage: this.selectedPage - 1,
            previousClasses: this.selectedPage <= 0 ? "hidden" : "",
            nextPage: this.selectedPage + 1,
            nextClasses: this.selectedPage >= 9 ? "hidden" : ""
        }));

        return this;
    },
    navigate: function() {
        $('body,html').animate({scrollTop: 0});
    }
});

$(Mixtress.initialize);
