(function (){
var Embedly = {
    'make': function (link){
        var url = link.get('href');
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
            'class': "embed",
            'src': json.url,
            'width': json.width,
            'height': json.height
        });
    },

    'thumbnail': function (json){
        var link = new Element("a", {'href': json.url, 'class': "embed"});
        var img = new Element("img", {
            'src': json.thumbnail_url,
            'width': json.thumbnail_width,
            'height': json.thumbnail_height
        });

        return link.grab(img);
    },

    'html': function (json){
        var el = new Element("div", {'html': json.html, 'class': "embed"}); 
        el.setStyles({'width': json.width, 'height': json.height });
        return el;
    },

    'renderExtras': function (name){
        var patterns = $A(arguments).map(function (name){
            var service = Embedly.services[name];
            return (service || []).map(function (str){
                return new RegExp(str, 'i');
            });
        }).flatten();

        function test(link){
            var url = link.get('href');
            return patterns.some(function (pattern){
                return url.match(pattern);
            });
        }

        return function (_, body){
            var links = body.getElements('a').filter(test);
            return links.map(Embedly.make);
        }
    }
}

Chorus.Embedly = Embedly;
}());
