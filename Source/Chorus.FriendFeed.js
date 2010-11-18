/*
---
description: Adds friendfeed.com capabilites to Chorus 

license: BSD-style

authors:
- Gerard Paapu

requires:
- Chorus

provides: [Chorus.FriendFeed]
*/

(function (Chorus){
    var FriendfeedStatus = new Class({
        'Extends': Chorus.Status,
        'initialize': function (id, username, avatar, date, text, url){
            this.url = url;
            this.parent(id, username, avatar, date, text); 
        },

        'getAvatar': function (){
            var imgUrl = "http://friendfeed-api.com/v2/picture/{username}?size=medium";
            return imgUrl.substitute(this);
        },

        'getUrl': function (){
            return this.url;
        },

        'getStreamUrl': function (){
            return "http://friendfeed.com/{username}".substitute(this);
        }
    });

    FriendfeedStatus.from = function (h){
        if (h instanceof Chorus.Status) {
            return h;
        }

        return new FriendfeedStatus(
            h.id, h.from.id, null,
            h.date, h.body, h.url
        );
    };

    var FriendFeedTimeline = new Class({
        'Extends': Chorus.Timeline,
        'initialize': function (username, options){
            this.username = username.toLowerCase();
            this.sendData = {
                'num': this.options.count || 9,
                'maxcomments': 0,
                'maxlikes': 0
            };
            this.queryUrl = this.queryUrl.substitute(this);
            this.parent(options);
        },

        'queryUrl': "http://friendfeed-api.com/v2/feed/{username}",
        'update': function (){
            this.request.send({'data': this.sendData});
        },

        'statusesFromData': function (data){
            return data.entries.map(FriendfeedStatus.from);
        }
    });

    var shorthands = [{
        'pattern': /^FF:(.*)$/,
        'fun': function (_, name){
            return new FriendFeedTimeline(name);
        }
    }];

    Chorus.Timeline.shorthands = shorthands.concat(Chorus.Timeline.shorthands);
    Chorus.FriendFeedTimeline = FriendFeedTimeline;
    Chorus.FriendfeedStatus = FriendfeedStatus;
}(Chorus));
