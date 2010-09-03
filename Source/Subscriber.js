/*
---
description: Implements the publisher/subscriber pattern 

license: BSD-style

authors:
- Gerard Paapu

requires:
- core: [Element.Event, Class.Extras]

provides: [Subscriber]
*/

var Subscription = new Class({
    'initialize': function (subscriber, publisher, type){
        this.subscriber = subscriber;
        this.publisher = publisher;
        this.type = type || 'update';
        this.handler = function (data){
            return subscriber.update(data, publisher);
        };

        this.publisher.addEvent(this.type, this.handler);
    },

    'cancel': function (){
        this.source.removeEvent(this.type, this.handler);
    }
});

var Subscriber = new Class({
    'subscriptions': [],

    'subscribe': function (publisher){
        var subscription = new Subscription(this, publisher);
        this.subscriptions.extend([subscription]);
    },

    'unsubscribe': function (subscription){
        var index = this.subscriptions.indexOf(subscription);
        if (index !== -1) {
             this.subscriptions.splice(index, 1);
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
