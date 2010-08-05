/*
---
description: Adds Buzz capabilites to Chorus 

license: MIT-style

authors:
- Gerard Paapu

requires:
- Chorus

provides: [Chorus.Buzz]
*/
(function (Chorus){
    Chorus.BuzzTimeline = new Class({
        'Extends': Chorus.Timeline,

        'initialize': function(userid, options){
            this.userid = userid;
            this.parent(options);
        },
        
        'queryUrl': "http://ajax.googleapis.com/ajax/services/feed/load",
        
        'update': function (){
            var feedUrl = escape("http://buzz.googleapis.com/feeds/{userid}/public/posted".substitute(this));
            var data = "q=" + feedUrl + "&" + $H({
                'num': this.options.count,
                'output': "json",
                'v': "1.0"
            }).toQueryString();

            var url = this.queryUrl + "?" + data;
            this.request.send({'url': url});
        },

        'statusesFromData': function (data){
            if (data.responseStatus === 200 && data.responseData) {
                var entries = data.responseData.feed.entries, id = this.userid;
                return entries.map(function (entry){
                    return Chorus.BuzzStatus.from(entry, id);
                });
            } else {
                return [];
            }
        }
    });

    Chorus.BuzzStatus = new Class({
        'Extends': Chorus.Status,

        'renderAvatar': function (){
            return Chorus.buzzAvatar(this.username);
        },

        'getStreamUrl': function (){
            return "http://www.google.com/profiles/{username}#buzz".substitute(this);
        },

        'getUrl': function (){
            return this.id;    
        }
    });

    Chorus.BuzzStatus.from = function (data, userid){
        return new Chorus.BuzzStatus(data.link, userid || data.author, null, data.publishedDate, data.content);
    };

    var shorthands = [{
        'pattern': /^BZ:(.*)$/,
        'fun': function (_, name){
            return new Chorus.BuzzTimeline(name);
        }
    }];

    Chorus.Timeline.shorthands = shorthands.extend(Chorus.Timeline.shorthands);

    Chorus.buzzAvatar = (function (){
        var cache = {};

        function init(name){
            getGoogleAvatar(name, removePlaceholders);
            cache[name] = {image: null, placeholders: []};
            return placeholder(name);
        }

        function placeholder(name){
            var p = new Element("div", {"class": "placeholder"});
            cache[name].placeholders.push(p);
            return p;
        }

        function removePlaceholders(name, src){
            var item = cache[name];
            item.image = new Element("img", {src: src, 'class': "avatar"});
            item.placeholders.each(function (p){
                item.image.clone().replaces(p);
            });
        }

        function getGoogleAvatar(name, callback){
            new Request.JSONP({
                url: "http://socialgraph.apis.google.com/otherme",
                data: {q: name + "@gmail.com"},
                callbackKey: "jscb",
                onComplete: function (json){
                    var user = json["http://www.google.com/profiles/"+name],
                    src = user && user.attributes.photo;

                    if (src) callback(name, src);
                }
            }).send();
        }

        return function buzzAvatar(name){
            var cached = cache[name];

            return !cached ? init(name)
                :  cached.image || placeholder(name);
        };
    }());
}(Chorus));
