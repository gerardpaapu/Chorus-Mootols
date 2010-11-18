/*
---
description: Adds twitter.com capabilites to Chorus 

license: BSD-style

authors:
- Gerard Paapu

requires:
- Chorus

provides: [Chorus.Twitter]
*/
(function (Chorus){
    var Tweet = new Class({
        'Extends': Chorus.Status,

        // represents a status update on twitter.
        'initialize': function init (id, username, avatar, date, text, reply) {
            this.parent(id, username, avatar, Tweet.datefix(date), text);
            this.reply = reply;
            this.text = Tweet.linkify(this.text);
        },

        'getUrl': function (){
            return "http://twitter.com/{username}/statuses/{id}".substitute(this);
        },
        
        'getStreamUrl': function (){
            return "http://twitter.com/{username}".substitute(this);
        },

        'renderReply': function (){
            return new Element('a', {
                'class': 'reply',
                'href': "http://twitter.com/{username}/statuses/{statusID}".substitute(this.reply),
                'text': "in reply to @{username}".substitute(this.reply)
            });
        },

        'toElement': function (options){
            var element = this.parent(options);
            if (this.reply) element.adopt(this.renderReply());
            return element;
        }
    });

     // Tweet.fromHash(h) -> Tweet
     //
     // A utility to process the JSON format that the Twitter API returns.
     //
     // It's a little convoluted because the Twitter Search API returns a
     // slightly different format
    Tweet.from = function (h) {
        if (h instanceof Tweet) {
            return h;
        }

        h = h.retweeted_status || h;
        
        var reply = h.in_reply_to_status_id ? {
            'username': h.in_reply_to_screen_name,
            'userID': h.in_reply_to_user_id,
            'statusID': h.in_reply_to_status_id
        } : null ;

        var searchAPI = !h.user; // is this data from the Search API?

        return new Tweet(
            h.id_str, 
            searchAPI? h.from_user : h.user.screen_name,
            searchAPI? h.profile_image_url : h.user.profile_image_url,
            h.created_at, h.text, reply
        );
    };

    Tweet.datefix = function(datestring) {
         // Twitter seems to give some wacky date format
         // that IE can't handle, so I convert it to something more normal.
        return datestring.replace(/^(.+) (\d+:\d+:\d+) ((?:\+|-)\d+) (\d+)$/, "$1 $4 $2 GMT$3");
    };

    Tweet.linkify = function(str) { 
        return str.replace(/(\s|^)(mailto\:|(news|(ht|f)tp(s?))\:\/\/\S+)/g,'$1<a href="$2">$2</a>')
            .replace(/(\s|^)@(\w+)/g, '$1<a class="mention" href="http://twitter.com/$2">@$2</a>')
            .replace(/(\s|^)#(\w+)/g, '$1<a class="hashTag" href="http://twitter.com/search?q=%23$2">#$2</a>');
    };
    
    Chorus.Tweet = Tweet;

    var TwitterTimeline = new Class({
        'Extends': Chorus.Timeline,
        'queryUrl': "http://api.twitter.com/1/statuses/public_timeline.json",
        'update': function (n) {
            var latest = this.latest ? {'since_id': this.latest.id } : {};
            this.request.send({'data': Object.merge(this.sendData, latest) });
        },

        'statusesFromData': function (data){
            return data.map(Tweet.from);
        }
    });

    var TwitterUserTimeline = new Class({
        'Extends': TwitterTimeline, 
        'initialize': function (username, options) {
            this.setOptions(options);
            this.username = username.toLowerCase();
            this.sendData = {
                'screen_name': this.username, 
                'count': this.options.count,
                'include_rts': this.options.includeRetweets    
            };
            this.parent(options);
        },
        'options': { 'includeRetweets': true },
        'userData': null,
        'queryUrl': "http://api.twitter.com/1/statuses/user_timeline.json"
    });

    var TwitterSearchTimeline = new Class({
        'Extends': TwitterTimeline,

        'initialize': function (searchTerm, options) {
            this.setOptions(options);
            this.searchTerm = searchTerm;
            this.sendData = {'q': searchTerm, 'rpp': this.options.count, 'result_type': "recent"};
            this.parent(options);
        },

        'queryUrl': "http://search.twitter.com/search.json",

        'prePublish': function (data) {
            if ('results' in data) {
                this.parent(data.results);
            }
        }
    });    

    var TwitterListTimeline = new Class({
        'Extends': TwitterTimeline,

        'initialize': function (user, listName, options) {
            var str = "http://api.twitter.com/1/{user}/lists/{listName}/statuses.json";
            this.queryUrl = str.substitute({
                'user': user,
                'listName': listName
            });

            this.parent(options);
        }
    });
    
    var TwitterAboutTimeline = new Class({
        'Extends': TwitterTimeline,
        'Implements': Subscriber,
        'initialize': function(screenname, options){
            this.user = new TwitterUserTimeline(screenname, options);
            this.search = new TwitterSearchTimeline("to:" + screenname); 
            this.subscribe(this.user);
            this.subscribe(this.search);
        },

        'update': function(data, source){
            this.publish(data);
        }
    });

    Chorus.Timeline.shorthands.append([
        {
            'pattern': /^@([a-z-_]+)\/([a-z-_]+)/i,
            'fun': function (_, name, list_name){
                return new TwitterListTimeline(name, list_name);
            }
        },
        {
            'pattern': /^@\+([a-z-_]+)/i,
            'fun': function (_, name){
                return new TwitterAboutTimeline(name);
            }
        },
        {
            'pattern': /^@([a-z-_]+)/i,
            'fun': function (_, name){
                return new TwitterUserTimeline(name);
            }
        },
        {
            'pattern': /^(.*)$/,
            'fun': function (_, terms){
                return new TwitterSearchTimeline(terms);
            }
        }
    ]);

    Chorus.TwitterTimeline = TwitterTimeline;
    Chorus.TwitterUserTimeline = TwitterUserTimeline;
    Chorus.TwitterSearchTimeline = TwitterSearchTimeline;
    Chorus.TwitterListTimeline = TwitterListTimeline;
    Chorus.TwitterAboutTimeline = TwitterAboutTimeline;
}(Chorus));
