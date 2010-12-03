// Embedly
// ======
//
// A client for the [Embedly](http://embed.ly) service. 
//
// Embedly provides embedded media (images, movies, etc.) for links to e.g.
// twitpic or youtube. Embedly supports over 100 services.
//
// To use the service, just call `Embedly.make(link)` where link is an anchor
// element or url. `make` returns a placeholder element that you must place
// where you would like the media to load. When the media does load, it will 
// replace the placeholder.
//
// Placeholders have the class `embedly_placeholder`, it's best to style them
// to be inconspicuous.
//
//  A simple example:
//
//     $$("a.replaceme").each(function (el) {
//         Embedly.make(el).inject(el, "after");
//     });
//
//  This will insert embedded media after each of the links with the class
//  "replaceme" that are supported by Embedly.

var Embedly = {
    // each supported service in the form 
    // services[name] = [regex, ...]
    // e.g. services['youtube'] = ["http:\\/\\/.*youtube\\.com\\/watch.*", ...]
    services: {}, 

    // A flat list of regexes for all supported services
    patterns: [],

    // Before `servicesLoaded` all calls to `make` are issued a placeholder
    // and their request is pushed onto the queue. When the services are
    // loaded, the queue is processed and each request fulfilled.
    queue: [],

    servicesLoaded: false,

    // has `loadServices` been called?
    initialized: false,

    showThumbs: false,

    data: {},

    // Make the first request to the Embedly API to get the list of 
    // supported services, when they come back populate `services`,
    // `patterns` and fire `onServicesLoaded` 
    loadServices: function () {
        var embedly = this;
        this.initialized = true;

        new Request.JSONP({
            url: "http://api.embed.ly/1/services/javascript",
            onComplete: function (json) {
                json.each(function (item, index){
                    var patterns = (item.regex).map(RegExp);
                    embedly.services[item.name] = patterns;
                    embedly.patterns.extend(patterns);
                });      

                embedly.onServicesLoaded();
            }
        }).send();
    },

    onServicesLoaded: function () {
        this.servicesLoaded = true;
        this.processQueue();
    },

    processQueue: function () {
        this.queue.each(function (item) {
            var url = item.url,
                placeholder = item.element;

            if (this.supported(url)) {
                this.__make__(url, placeholder);    
            }
        }, this);
    },

    // The main interface for users, always returns a placeholder element
    // the element may not ever be replaced, so it should be styled
    // to be inconspicuous e.g. height: 0; visibility: hidden;
    make: function (link){
        var url = link instanceof Element ? link.get('href') : link,
            placeholder = new Element('div', {'class': "embed embedly_placeholder"}); 

        if (this !== Embedly) {
            return Embedly.make(link);
        }

        if (!this.initialized) {
            this.loadServices();
        }

        if (!this.servicesLoaded) {
            this.queue.push({url: url, element: placeholder});
        } else if (this.supported(url)) {
            this.__make__(url, placeholder); 
        }

        return placeholder;
    },

    // __make__ should only be called when the services are loaded
    // and the url matches one of the supported patterns. It makes
    // the call to the embedly api and replaces the placeholder
    // with the final embedded media
    __make__: function (url, placeholder) {
        var data = $merge({url: url}, this.data);
                
        new Request.JSONP({
            'url': "http://api.embed.ly/v1/api/oembed",
            'data': data,
            'onComplete': function (json){
                var el = Embedly.fromJSON(json);
                if (el) {
                    el.replaces(placeholder);
                }
            }
        }).send();
    },

    // Should only be called after the services have loaded
    // returns true if a url matches any of the supported
    // regexes
    supported: function (url) {
        if (!this.servicesLoaded) {
            throw Error("Services not loaded");
        }

        return this.patterns.some(function (pattern) {
            return pattern.test(url);
        });
    },

    // Processes the JSON that is returned from embedly
    // and returns an Element or false if the response is
    // bad. The types are documented here:
    //
    // http://api.embed.ly/docs/oembed#oembed-types
    fromJSON: function (json){
        var type = json.type;
        return json.thumbnail_url && this.showThumbs ? this.toThumbnail(json) 
            :  type === 'photo'   ? this.toPhoto(json)
            :  type === 'video' || 
               type === 'rich'    ? this.toHtml(json)
            :  false;
    },

    toPhoto: function (json){
        return new Element("img", {
            'class': "embed",
            'src': json.url,
            'width': json.width,
            'height': json.height
        });
    },

    toThumbnail: function (json){
        var link = new Element("a", {'href': json.url, 'class': "embed"});
        var img = new Element("img", {
            'src': json.thumbnail_url,
            'width': json.thumbnail_width,
            'height': json.thumbnail_height
        });

        return link.grab(img);
    },

    toHtml: function (json){
        var el = new Element("div", {'html': json.html, 'class': "embed"}); 
        el.setStyles({'width': json.width, 'height': json.height });
        return el;
    }
};
