(function (){
var Embedly = {
    'make': function (link){
        var url = link instanceof Element ? link.get('href') : link;
        var placeholder = new Element('div', {'class': "embed"}); 

        new Request.JSONP({
            'url': "http://api.embed.ly/v1/api/oembed",
            'data': { 'url': url },
            'onComplete': function (json){
                var el = Embedly.fromJSON(json);
                if (el) el.replaces(placeholder);
            }
        }).send();

        return placeholder;
    },
    
    'fromJSON': function (json){
        var type = json.type;
        return json.thumbnail_url ? Embedly.thumbnail(json) 
            :  type === 'photo'   ? Embedly.photo(json)
            :  type === 'video' 
            || type === 'rich'    ? Embedly.html(json)
            :  false;
    },

    'photo': function (json){
        return new Element("img", {
            'src': json.url,
            'width': json.width,
            'height': json.height
        });
    },

    'thumbnail': function (json){
        var link = new Element("a", {href: json.url});
        var img = new Element("img", {
            'src': json.thumbnail_url,
            'width': json.thumbnail_width,
            'height': json.thumbnail_height
        });

        return link.grab(img);
    },

    'html': function (json){
        var el = new Element("div", {'html': json.html}); 
        el.setStyles({'width': json.width, 'height': json.height });
        return el;
    },

    'renderExtras': function (pattern){
        return function (_, body){
            return body.getElements('a').filter(test).map(Embedly.make);
        }

        function test(link){
            return link.get('href').match(pattern);
        }
    }
}

Chorus.Embedly = Embedly;
}());
