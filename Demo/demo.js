window.addEvent('domready', function() {	
    var view = new Chorus.View({
        'feeds': new Chorus.TwitterSearchTimeline("xkcd.com"), 
        'count': 30,
        'renderOptions': {
            'extras': Chorus.Embedly.renderExtras("xkcd", "youtube")
        }
    });

    $(document.body).adopt(view);
});
