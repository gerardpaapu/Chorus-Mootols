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

        'renderReply': function () {
            return new Element('a', {
                'class': 'reply',
                'href': "http://twitter.com/{username}/statuses/{statusID}".substitute(this.reply),
                'text': "in reply to @{username}".substitute(this.reply)
            });
        }
    });

    Tweet.extend({
         // Tweet.fromHash(h) -> Tweet
         //
         // A utility to process the JSON format that the Twitter API returns.
         //
         // It's a little convoluted because the Twitter Search API returns a
         // slightly different format
        'from': function (h) {
            if (h instanceof Tweet) return h;
            h = $H(h);

            var reply = h.get('in_reply_to_status_id') ? {
                'username': h.get('in_reply_to_screen_name'),
                'userID': h.get('in_reply_to_user_id'),
                'statusID': h.get('in_reply_to_status_id')
            } : null ;

            var searchAPI = !h.has('user'); // is this data from the Search API?

            return new Tweet(
                h.get('id'), 
                searchAPI? h.get('from_user') : h.get('user')['screen_name'],
                searchAPI? h.get('profile_image_url') : h.get('user')['profile_image_url'],
                h.get('created_at'), h.get('text'), reply
            );
        },

        'datefix': function(datestring) {
             // Twitter seems to give some wacky date format
             // that IE can't handle, so I convert it to something more normal.
            return datestring.replace(/^(.+) (\d+:\d+:\d+) ((?:\+|-)\d+) (\d+)$/, "$1 $4 $2 GMT$3");
        },

        'linkify': function(str) { 
            return str.replace(/(\s|^)(mailto\:|(news|(ht|f)tp(s?))\:\/\/\S+)/g,'$1<a href="$2">$2</a>')
                .replace(/(\s|^)@(\w+)/g, '$1<a class="mention" href="http://twitter.com/$2">@$2</a>')
                .replace(/(\s|^)#(\w+)/g, '$1<a class="hashTag" href="http://twitter.com/search?q=%23$2">#$2</a>');
        }
    });
    
    Chorus.extend({'Tweet': Tweet});

    var TwitterTimeline = new Class({
        'Extends': Chorus.Timeline,
        'queryUrl': "http://api.twitter.com/1/statuses/public_timeline.json",
        'update': function (n) {
            var latest = this.latest ? {'since_id': this.latest } : {};
            this.request.send({'data': $merge(this.sendData, latest) });
        },

        'prePublish': function (data) {
            var newTweets = $splat(data).map(Tweet.from);
            
            if (newTweets.length) { 
                this.latest = $H(newTweets[0]).get('id');
                this.publish(newTweets);
            }
        }
    });

    var TwitterUserTimeline = new Class({
        'Extends': TwitterTimeline, 
        'initialize': function (username, options) {
            this.username = username.toLowerCase();
            this.sendData = {'screen_name': this.username, 'count': this.options.count};
            this.parent(options);
        },

        'userData': null,
        'queryUrl': "http://twitter.com/statuses/user_timeline.json"
    });

    var TwitterSearchTimeline = new Class({
        'Extends': TwitterTimeline,

        'initialize': function (searchTerm, options) {
            this.setOptions(options);
            this.searchTerm = searchTerm;
            this.sendData = {'q': searchTerm, 'rpp': this.options.count};
            this.parent(options);
        },

        'queryUrl': "http://search.twitter.com/search.json",

        'prePublish': function (data) {
            if ('results' in data) this.parent(data.results);
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

    Chorus.Timeline.shorthands.extend([
        {
            'pattern': /^@([a-z-_]+)\/([a-z-_]+)/i,
            'fun': function (_, name, list_name){
                return new TwitterListTimeline(name, list_name);
            }
        },
        {
            'pattern': /^@\+([a-z-_]+)/,
            'fun': function (_, name){
                return new TwitterAboutTimeline(name);
            }
        },
        {
            'pattern': /^@([a-z-_]+)/,
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

    Chorus.extend({
        'TwitterTimeline': TwitterTimeline,
        'TwitterUserTimeline': TwitterUserTimeline,
        'TwitterSearchTimeline': TwitterSearchTimeline,
        'TwitterListTimeline': TwitterListTimeline,
        'TwitterAboutTimeline': TwitterAboutTimeline
    });
}(Chorus));
