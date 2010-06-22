/*
---
description: 

license: MIT-style

authors:
- Gerard Paapu

requires:
- Subscriber
- core/1.2.4: '*'
- more/1.2.4: Request.JSONP, Date.Extras, Class.Binds

provides: [Chorus]
*/

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
            return new Element("p", {'class': "statusBody", 'html': this.text});
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
        // Fetches statuses with a JSONP API call
        // and publishes the results.
        'Extends': Publisher,
        'Implements': [Options, Events],
        'Binds': ["isNew"],
        'initialize': function (options) {
            this.setOptions(options);
            this.latest = null;
            this.request = new Request.JSONP({
                'url': this.queryUrl,
                'onComplete': this.prePublish.bind(this)
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

        'statusesFromData': function (data) {
           return []; 
        },

        'prePublish': function (data){
            var statuses = this.statusesFromData(data).filter(this.isNew); 

            if (statuses.length) {
                statuses.sort(Status.byDate);
                this.latest = statuses[0];
                this.publish(statuses);
            }
        },

        'isNew': function (status){
            return !this.latest || (status.date.getTime() > this.latest.date.getTime());
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
            if(this.options.container) $(this.options.container).adopt(this);
        },

        'statuses': [],
        'htmlCache': $H(),
        
        'options': {
            'template': Chorus.templates.basic,
            'count': 10,
            'feeds': [],
            'container': false
        },

        'update': function (statuses, source) {
            this.statuses.extend(statuses);
            this.distinct();
            this.statuses.sort(Status.byDate);
            this.fireEvent('update', [statuses, source, this]);
        },

        'distinct': function (){
            var out = [];
            function eq(a){
                return function (b){
                    return Status.equal(a, b);
                };
            }
            
            function addToSet(val){
                if (!out.some(eq(val))) out.push(val);
            }

            this.statuses.each(addToSet);
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

            this.getChildren().each(function (child){
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
        'view': function (){ // just a convenience
            return new View({'feeds': $A(arguments)});
        }
    });
}(Chorus));