var view = new Chorus.View({'feeds': ["@barackobama", "FB:john.mccain", "FF:paul"], 'count': 30});

window.addEvent('domready', function() {	
    $(document.body).adopt(view);
});
