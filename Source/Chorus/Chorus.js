var Chorus = $H();

(function (Chorus){
    var Status = new Class({
        'initialize': function init (id, username, avatar, date, text) {
            this.id = id;
            this.username = username;
            this.avatar = avatar;
            this.text = text;
            this.date = Date.parse(date);
        },

        // toKey() -> string: generates a string key to store this Status in a Hash
        'toKey': function () {
            return "<Status:{username} #{id}>".substitute(this);
        },

        'toElement': function () {
            if (!(this.element)) this.element = Chorus.templates.basic(this);
            return this.element;
        },

        'getAvatar': function (){
            return this.avatar;
        },

        'renderAvatar': function (){
            var img = new Element('img', {'src': this.getAvatar(), 'class': "avatar"});
            return new Element("a", {'href': this.getStreamUrl()}).adopt(img);
        },

        'getTimestamp': function (){
            var timestamp = new Element('span');
            var getAge = function (){
                return this.date.timeDiffInWords();
            }.bind(this);

            function update (){
                timestamp.set('text', $try(getAge, $lambda("A While Ago")));
            };

            update();
            update.periodical(6000);

            return timestamp;
        },

        'renderTimestamp': function () {
            return new Element('a', {
                'class': "date",
                'href': this.getUrl()
            }).adopt(this.getTimestamp());
        },

        'renderScreenName': function () {
            return new Element('a', {
                'text': this.username,
                'class': "username",
                'href': this.getStreamUrl()
            });
        },

        'renderBody': function (){
            return new Element('p', {'class': 'statusBody', 'html': this.text});
        }
    });

    Status.extend({
        'equal': function(a, b){
            return a.toKey() === b.toKey();
        },

        'byDate': function(a, b){
            return b.date.getTime() - a.date.getTime();
        }
    });

    Chorus.extend({'Status': Status});
        
    var Timeline = new Class({
        // Contains the Tweets recieved by a particular API Call.
        // Periodically repeats that API call to update our 
        // collection of Tweets with the server.
        'Extends': Publisher,
        'Implements': [Options, Events],
        'initialize': function (options) {
            this.setOptions(options);
            this.latest = null;
            this.request = new Request.JSONP({
                url: this.queryUrl,
                onComplete: this.prePublish.bind(this)
            });

            if (this.options.updateOnStart) this.update();
            if (this.options.updatePeriod) this.startUpdates();
        },
        
        'options': {
            'count': 25,
            'updateOnStart': true,
            'updatePeriod': 90000
            // onUpdate: $empty
        },

        'timer': null,

        'startUpdates': function (period) {
            period = period || this.options.updatePeriod;
            this.timer = this.update.periodical(period, this);
            return this;
        },

        'stopUpdates': function () {
            $clear(this.timer);
            return this;
        },

        'update': function (n) {
            this.request.send();
        },

        'prePublish': function (statuses) {
            if (statuses.length) this.publish(statuses);
        }
    });

    Timeline.shorthands = [];
    Timeline.from = function (t){
        var i, l, shorthand, match;

        if (t instanceof Timeline) return t;

        for (i=0, l=Timeline.shorthands.length; i<l; i++) {
            shorthand = Timeline.shorthands[i];
            match = shorthand.pattern.exec(t);

            if (match) return shorthand.fun.apply(null, match); 
        }

        return null;
    };

    Chorus.extend({'Timeline': Timeline});
    Chorus.extend({'templates': $H()});
    Chorus.templates.extend({
        'basic': function (status) {
            var element = new Element('div', {'class': "status"});

            element.adopt(
                status.renderAvatar(),
                status.renderScreenName(),
                status.renderBody(),
                status.renderTimestamp()
            );

            if (status.reply) element.adopt(status.renderReply());

            return element;
        }
    });

    var View = new Class({
        'Extends': Subscriber,
        'Implements': [Options, Events],

        'initialize': function (options) {
            this.setOptions(options);
            $splat(options.feeds).each(this.subscribe.bind(this));
        },

        'statuses': [],
        'htmlCache': $H(),
        
        'options': {
            'template': Chorus.templates.basic,
            'count': 10,
            'feeds': []
        },

        'update': function (statuses, source) {
            this.statuses.extend(statuses);
            this.distinct();
            this.statuses.sort(Status.byDate);
            this.fireEvent('update', [statuses, source, this]);
        },

        'distinct': function (){
            var out = [];
            
            function contains(arr, val, eq){
                return arr.some(function (v) { return eq(v, val); });
            }

            this.statuses.each(function(val){
                if (!contains(out, val, Status.equal)) out.push(val);
            });

            this.statuses = out;
        },
        
        'subscribe': function (source){
            this.parent(Timeline.from(source));
        },

        'toElement': function () {
            var element = new Element('div', {'class': 'view'});
            this.updateElement.call(element, this.statuses, null, this);
            this.addEvent('update', this.updateElement.bind(element));
            return element.store('View', this);
        },

        'updateElement': function (statuses, source, view){
            var render = view.renderStatus.bind(view),
                children = view.statuses.slice(0, view.options.count).map(render);

            this.getChildren().map(function (child) {
                child.dispose();
            });                        

            this.adopt(children);
        },

        'renderStatus': function (status) {
            var template = this.options.template,
                htmlCache = this.htmlCache,
                key = status.toKey();

            if (!htmlCache.has(key)) htmlCache.set(key, template(status));

            return htmlCache.get(key);
        }
    });

    Chorus.extend({
        'View': View,
        'view': function (){
            return new View({'feeds': $A(arguments)});
        }
    });
}(Chorus));
