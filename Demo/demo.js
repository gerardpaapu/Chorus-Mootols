window.addEvent('domready', function() {	
    var view = new Chorus.View({
        'feeds': ["@sharkbrain", "FF:paul", "FB:BarackObama"], 
        'count': 30
    });

    $(document.body).adopt(view);
});
