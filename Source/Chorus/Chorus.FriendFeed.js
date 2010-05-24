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
        if (h instanceof Chorus.Status) return h;

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
            this.isNew = this.isNew.bind(this);
            this.parent(options);
        },

        'queryUrl': "http://friendfeed-api.com/v2/feed/{username}",
        'update': function (){
            this.request.send({'data': this.sendData});
        },

        'prePublish': function (data){
            if (data.entries.length) {
                var statuses = data.entries.map(FriendfeedStatus.from).filter(this.isNew);

                if (statuses.length) {
                    this.latest = new Date(statuses[0]['date']).getTime();
                    this.publish(statuses);
                }
            }
        },

        'isNew': function (status){
            return !this.latest || (status.createdAt.getTime() > this.latest);
        }
    });

    var shorthands = [{
        'pattern': /^FF:(.*)$/,
        'fun': function (_, name){
            return new FriendFeedTimeline(name);
        }
    }];

    Chorus.Timeline.shorthands = shorthands.extend(Chorus.Timeline.shorthands);

    Chorus.extend({
        'FriendFeedTimeline': FriendFeedTimeline,
        'FriendfeedStatus': FriendfeedStatus
    });
}(Chorus));
