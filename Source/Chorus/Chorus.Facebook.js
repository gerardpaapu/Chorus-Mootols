(function (Chorus){
    // Adds support for Facebook Streams
    var FacebookTimeline = new Class({
        'Extends': Chorus.Timeline,
            
        'initialize': function (username, options){
            this.username = username;
            this.queryUrl = this.queryUrl.substitute(this);
            this.parent(options);
        },

        'queryUrl': "https://graph.facebook.com/{username}/feed",

        'prePublish': function (data){
           var statuses = $splat(data.data).map(FacebookStatus.from); 

           if (statuses.length) this.publish(statuses);
        }
    });

    var FacebookStatus = new Class({
        'Extends': Chorus.Status,
        'initialize': function init (id, username, avatar, date, text, userid) {
            this.userid = userid;
            this.parent(id, username, avatar, date, text);
        },

        'getStreamUrl': function (){
            return this.getUrl();
        },

        'getUrl': function (){
            return "http://facebook.com/{userid}/posts/{id}".substitute(this);
        },

        'getAvatar': function (){
            return "http://graph.facebook.com/{userid}/picture".substitute(this);
        }
    });

    FacebookStatus.from = function (data){
        if (data instanceof Chorus.Status) return data;
        var match = /_(.*)$/.exec(data.id), id = match && match[1];
        var link = data.source || data.link;
        var text = (data.message || '') + (link ? '<a href="'+link+'">'+data.name+'</a>': '');
        return new FacebookStatus(id, data.from.name, null, data.created_time, text, data.from.id);
    };

    var shorthands = [{
        'pattern': /^FB:(.*)$/,
        'fun': function (_, name){
            return new FacebookTimeline(name);
        }
    }];

    Chorus.Timeline.shorthands = shorthands.extend(Chorus.Timeline.shorthands);
    Chorus.extend({
        'FacebookTimeline': FacebookTimeline,
        'FacebookStatus': FacebookStatus
    });
}(Chorus));
