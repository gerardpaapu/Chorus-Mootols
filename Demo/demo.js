var view = new Chorus.View({'feeds': ["@sharkbrain", "#theguild"], 'count': 30});

window.addEvent('domready', function() {	
    $(document.body).adopt(view);
});
