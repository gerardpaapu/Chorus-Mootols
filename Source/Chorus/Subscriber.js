var Subscription = new Class({
    'initialize': function (subscriber, broadcaster, type){
        this.subscriber = subscriber;
        this.broadcaster = broadcaster;
        this.type = type || 'update';
        this.handler = function (data){
            return subscriber.update(data, broadcaster);
        };

        this.broadcaster.addEvent(this.type, this.handler);
    },

    'cancel': function (){
        this.source.removeEvent(this.type, this.handler);
    }
});

var Subscriber = new Class({
    'subscriptions': [],

    'subscribe': function (broadcaster){
        var subscription = new Subscription(this, broadcaster);
        this.subscriptions.extend([subscription]);
    },

    'unsubscribe': function (subscription){
        var index = this.subscriptions.indexOf(subscription);
        if (index !== -1) {
             delete this.subscriptions[index];
             subscription.cancel();
        }
    },

    'update': function (data, source) {
        return this;
    }
});

var Publisher = new Class({
    'Implements': Events,
    'publish': function (data, type){
        var _type = type || 'update';
        this.fireEvent(_type, [data]);
    }
});

var Aggregator = new Class({
    'Extend': Publisher,
    'Implement': Subscriber,
    'initialize': function (){
        $A(arguments).map(this.subscribe.bind(this));
    },

    'update': function (data, source){
        this.publish(data);
    }
});
