window.addEvent('domready', function() {	
    var view = new Chorus.View({
        'feeds': ["@barackobama", "FB:john.mccain", "FF:paul"], 
        'count': 30
    });

    $(document.body).adopt(view);
});
