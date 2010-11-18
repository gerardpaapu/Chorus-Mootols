/*
---
description: Adds wordpress capabilites to Chorus 

license: BSD-style

authors:
- Gerard Paapu

requires:
- Chorus.Twitter

provides: [Chorus.Wordpress]
*/
(function (Chorus){
    var WordpressTimeline = new Class({
        'Extends': Chorus.TwitterUserTimeline,
        'queryUrl': "http://twitter-api.wordpress.com/statuses/user_timeline.json",
        'prePublish': function (data){
            var newTweets = Array.splat(data).map(WordpressStatus.from);
            this.parent(newTweets);
        }
    });

    var WordpressStatus = new Class({
        'Extends': Chorus.Tweet,
        'getStreamUrl': function (){
            return "http://{username}".substitute(this);
        },

        'getUrl': function (){
            return "http://{username}".substitute(this);
        }
    });

    WordpressStatus.from = function (h){
        if (h instanceof Chorus.Tweet) {
            return h;
        }

        var reply = null, u = h.user;

        return new WordpressStatus(
            h.id, u.screen_name,
            u.profile_image_url,
            h.created_at, h.text, reply
        );
    };

    var shorthands = [{
        'pattern': /^WP:(.*)$/,
        'fun': function (_, name){
            return new WordpressTimeline(name);
        }
    }];
    
    Chorus.Timeline.shorthands = shorthands.concat(Chorus.Timeline.shorthands);
    Chorus.WordpressTimeline = WordpressTimeline;
    Chorus.WordpressStatus = WordpressStatus;
}(Chorus));
