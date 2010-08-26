var view = null;
window.addEvent('domready', function() {	
    view = new Chorus.View({
        'feeds': new Chorus.TwitterSearchTimeline('yfrog'), 
        'count': 30,
        'renderOptions': {
            'extras': Chorus.Embedly.renderExtras(/^http:\/\/yfrog/)
        }
    });

    $(document.body).adopt(view);
});
