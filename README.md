Twitter
======

Basic Usage
-----------

Twitter.View is a class that monitors any number of twitter timelines.
The option 'feeds' can take a string or an array of strings.
It understands a shorthand for users "@user", lists "@user/list", and everything else becomes a search.

This example will follow the user "sharkbrain", a list he owns called "my-friends" and search for any posts directed to him.

    var sharkView = new Twitter.View({'feeds': ['@sharkbrain', '@sharkbrain/my-friends', 'to:sharkbrain']});

`View`s, `Timeline`s and `Tweet`s all implement `toElement`, and therefore can be `grab`bed, `adopt`ed and `$`ed.

    $('TwitterContainer').empty().grab(sharkView);


Twitter.Timeline
----------------

Timeline is the base-class and really shouldn't be instantiated directly.

There are three basic types of usable timelines. UserTimeline, ListTimeline and SearchTimeline.

UserTimeline takes the screenname of a user and gets the statuses
you would see at http://twitter.com/screenname

    new Twitter.UserTimeline("sharkbrain");

ListTimeline takes the screenname of a user and a list name, and gets
the statuses that you would see at http://twitter.com/screenname/listname

    new Twitter.ListTimeline("sharkbrain", "my-friends");

SearchTimeline takes a search string as described here http://search.twitter.com/operators 

    new Twitter.SearchTimeline("#sharks");



Twitter.View
------------

A View monitors a Timeline and updates when they update. 

    var sharkbrain = new Twitter.UserTimeline("sharkbrain");
    var friends = new Twitter.ListTimeline("sharkbrain", "my-friends");

    new Twitter.View({'feeds': [sharkbrain, friends, sharkSearch]});

If you pass it strings instead of Timelines, it understands a shorthand for users "@user" and lists "@user/list-name", and everything else becomes a search timeline.

    var view = new Twitter.View({'feeds': ["@sharkbrain", "@sharkbrain/my-friends", "#sharks"]});

You can also watch a timeline by using the `subscribe` method.

    var view = new Twitter.View();
    view.subscribe("@sharkbrain", "to:sharkbrain");    

