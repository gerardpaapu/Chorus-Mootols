var Twitter = (function (){
    var Twitter = $H();
    
    var Tweet = new Class({
        /** Tweet - A Tweet that was twut on twitter */
        'initialize': function init (id, screenName, createdAt, text, reply) {
            this.id = id;
            this.screenName = screenName;
            this.reply = reply;
            this.text = text;
            this.createdAt = Date.parse(datefix(createdAt));
        },

        'toKey': function () {
            return "<Twitter:{screenName} #{id}>".substitute(this);
        },
        
        'toElement': function () {
            if (!(this.element)) this.element = renderTweetHtml(this);
            return this.element;
        }
    });

    Tweet.extend({
        'fromHash': function (h) {
            var reply = h.get('in_reply_to_status_id') ? {
                'screenName': h.get('in_reply_to_screen_name'),
                'userID':     h.get('in_reply_to_user_id'),
                'statusID':   h.get('in_reply_to_status_id')
            } : null ;

            return new Twitter.Tweet(
                h.get('id'), (h.has('from_user') ? h.get('from_user') : h.get('user').screen_name),
                h.get('created_at'), h.get('text'), reply
            );
        }
    });
    
    Twitter.extend({'Tweet': Tweet});

    var Timeline = new Class({
        /** One user's twitter timeline */
        'Implements': [Options, Events],
        'initialize': function (options) {
            this.setOptions(options);
            this.latest = null;
            this.tweets = [];

            this.request = new Request.JSONP({
                method: 'get',
                url: this.queryUrl,
                onComplete: this.addData.bind(this)
            });


            if (this.options.updateOnStart) {
                this.update();
            }

            if (this.options.updatePeriod) {
                this.update.periodical(this.options.updatePeriod, this);
            }
        },

        'queryUrl': "http://api.twitter.com/1/statuses/public_timeline.json",
        
        'options': {
            'count': 10,
            'updateOnStart': true,
            'updatePeriod': 90000
            // onUpdate: $empty
        },

        /**
         * get the next n tweets (since this.latest)
         * add them to this.tweets and fire the update event */
        'update': function (n) {
            var data = this.sendData;
            
            if (this.latest != null) data = $extend(data, {'since_id': this.latest });

            this.request.send({'data': data});

            return this;
        },

        'addData': function (data) {
            var newTweets = $splat(data).map(function (n) {
                return Tweet.fromHash($H(n));
            });
            
            if (data.length) extractUserData(data);

            if (newTweets.length) { 
                this.tweets = newTweets.concat(this.tweets);
                this.latest = $H(newTweets[0]).get('id');
                this.fireEvent('update', [this, newTweets]);
            }
        },

        'toElement': function () {
            var element = new Element('div', {
                'class': 'twitterStream'
            });
            
            element.adopt(this.tweets);

            this.addEvent(
                'update', function (tweets, newTweets) {
                    element.adopt(newTweets);
                });

            return element;
        }
    });

    var UserTimeline = new Class({
        'Extends': Timeline, 
        'initialize': function (username, options) {
            this.username = username.toLowerCase();
            this.userData = null;
            this.sendData = {'screen_name': this.username, 'count': this.options.count || 9};
            this.parent(options);
        },

        'update': function (data) {
            this.parent(data);

            if(!this.userData) this.userData = userData.get(this.username);
        },

        'queryUrl': "http://twitter.com/statuses/user_timeline.json"
    });


    var SearchTimeline = new Class({
        'Extends': Timeline,

        'initialize': function (searchTerm, options) {
            this.searchTerm = searchTerm;
            this.sendData = {'q': searchTerm, 'rpp': 10};
            this.parent(options);
        },

        'queryUrl': "http://search.twitter.com/search.json",

        'addData': function (data) {
            if ('results' in data) this.parent(data.results);
        }
    });    

    Twitter.extend({'UserTimeline': UserTimeline, 'SearchTimeline': SearchTimeline});

    var View = new Class({
        'Implements': [Options, Events],

        'initialize': function () {
            var args = $A(arguments),
                feeds = args.slice(0, args.length - 1),
                options = args.getLast();

            this.setOptions(options);
            this.subscribe.apply(this, feeds);
            this.tweets = [];
            this.htmlCache = $H();
        },

        'options': {
            'template': renderTweetHtml,
            'count': 5
        },

        'subscriptions': [],        
        'subscribe': function (timeline/*, ... */) {
            var view = this;

            $A(arguments).each(
                function (t) {
                    var timeline = timelineify(t);
                    
                    timeline.addEvent('update', function (source, newTweets) {
                        view.add(newTweets, this);   
                    });

                    view.subscriptions.extend([timeline]);
                });

            function timelineify (t) {
                var name = /^@([a-z]+)/i,
                    tag  = /^#([a-z]+)/i;

                return t instanceof Timeline ? t
                    :  tag.test(t)  ? new SearchTimeline(tag.exec(t)[0])
                    :  name.test(t) ? new UserTimeline(name.exec(t)[1])
                    :  new UserTimeline(t);
            }
        },

        'add': function (tweets, source) {
            this.tweets.extend(tweets);
            this.tweets.sort(newest);

            this.fireEvent('update', [tweets, source, this]);

            function newest (a, b) {
                function age(n) {
                    return n.createdAt.getTime();
                }
                
                return age(b) - age(a);
            }
        },

        'toElement': function () {
            var element = new Element('div', {'class': 'TwitterView'});
            element.adopt(this.tweets.map(this.options.template));

            this.addEvent('update', function(tweets, source, view) {
                var render = this.renderTweet.bind(this),
                    children = view.tweets.slice(0, this.options.count).map(render);

                element .getChildren().map(function (child) {
                    child.dispose();
                });                        

                element .adopt(children);
            });

            return element;
        },

        'renderTweet': function (tweet) {
            var template = this.options.template,
                htmlCache = this.htmlCache,
                key = tweet.toKey();

            if (!htmlCache.has(key)) htmlCache.set(key, template(tweet));

            return htmlCache.get(key);
        }
    });

    Twitter.extend({'View': View});

    var userData = $H();
    Twitter.extend({ 'userData': userData });
    
    function getAvatar(name) {
        name = name.toLowerCase();

        if (userData.has(name)) {
            var src = userData.get(name).get('profile_image_url');
            return new Element('img', { 'src': src });
        } else {
            return "";
        }
    }

    function tweetBody(text) { 
        function linkify(str) {
            /** linkify makes @mentions, #tags and urls into links */
            return str .replace(/(\s|^)(mailto\:|(news|(ht|f)tp(s?))\:\/\/\S+)/g,'$1<a href="$2">$2</a>')
                .replace(/(\s|^)@(\w+)/g, '$1<a href="http://twitter.com/$2">@$2</a>')
                .replace(/(\s|^)#(\w+)/g, '$1<a href="http://twitter.com/search?q=%23$2">#$2</a>');
        };

        return new Element('p', {'class': 'tweetBody', 'html': linkify(text)});
    }

    function datefix(datestring) {
        /* Twitter seems to give some wacky date format
         * that IE can't handle, so I just move some shit around */
        return  datestring.replace(/^(.+) ((?:\+|-)\d+) (\d+)$/, "$1 $3 GMT$2");
    };


    function renderTweetHtml(tweet) {
        var element = new Element( 'div', {'class': "tweet"});

        var timestamp = new Element('a', {
            'class': 'date',
            'href': "http://twitter.com/{screenName}/statuses/{id}".substitute(tweet),
            'text': tweet.createdAt.timeDiffInWords()
        });

        var timeout = (function () {
            timestamp.set('text', tweet.createdAt.timeDiffInWords());
        }).periodical(60000 + Math.floor(Math.random() * 1000) - 500);

        element.adopt(
            getAvatar(tweet.screenName),
            new Element('a', {
                'text': tweet.screenName,
                'href': "http://twitter.com/{screenName}".substitute(tweet)
            }),
            timestamp,
            tweetBody(tweet.text)
        );

        if (tweet.reply) {
            element.adopt(
                new Element('a', {
                    'class': 'reply',
                    'href': "http://twitter.com/{screenName}/statuses/{statusID}".substitute(tweet.reply),
                    'text': "in reply to @{screenName}".substitute(tweet.reply)
                }));
        }

        return element;
    }
    
    Twitter.extend({ 'templates': $H({ 'basic': renderTweetHtml }) });

    function distinct(ls, eq) {
        eq = eq || op['=='];

        return ls.length === 0 ? []
            :  ls.slice(0, 1).concat(distinct(ls.filter(function (x) {
                return !eq(ls[0], x)
            })));
    }

    function extractUserData(json) {
        try {
            var distinctUsers = distinct(json, function (a, b) {
                return getId(a) === getId(b);

                function getId(tweet) {
                    var user = $H(tweet).get('user'),
                        name = user ? $H(user).get('screen_name') 
                            :  $H(tweet).get('from_user');

                    return name.toLowerCase();
                }
            });

            var JSONList = distinctUsers.map(function (tweet) { 
                tweet = $H(tweet);
                return tweet.has('user') ? $H(tweet.get('user')) : tweet;
            });

            JSONList.each(function (user) {
                var name = (user.has('screen_name') ? user.get('screen_name') 
                           : user.get('from_user')).toLowerCase();

                if (!userData.has(name)) userData.set(name, user);
            });
        } catch (err) {}
    }

    return Twitter; 
}());
