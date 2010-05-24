Twitter.extend({
    'imageSites': $H({
        'twitpic.com':    "show/{size}/{id}",
        'yfrog.com':      "{id}.th.jpg",
        'yfrog.us':       "{id}.th.jpg",
        'tweetphoto.com': "show/{size}/{id}",
        'img.ly':         "show/{size}/{id}"
    }),

    'imageLinkToThumbnail': function (link, size) {
        var uri    = new URI(link),
            domain = uri.get('host'),
            id     = uri.get('file'),
            site   = Twitter['imageSites'].get(domain),
            tsize  = (size && size.match(/(thumb)|(mini)/)) ? size : 'thumb',
            src    = site && site.substitute({'id': id, 'size': tsize});

        if (src) {
            link.set('html', '');
            link.adopt(new Element('img', {
                'src': "http://{0}/{1}".substitute([domain, src]),
                'alt': 'thumbnail provided by ' + domain
            }));
        }
    },

    'expandImageLinks': function (html) {
        html.getElements('a').each(function (link) {
            return Twitter.imageLinkToThumbnail(link, 'thumb')
        });

        return html;
    }
});

Twitter.templates.extend({'imagethumbs': compose(Twitter.expandImageLinks, Twitter.templates.basic) });

Twitter.extend({
    'urlShorteners': ['bit.ly', 'tinyurl.com', 'is.gd', 'tr.im', 'ow.ly'],
    'deshortenUrl': 'http://thecyberplains.com:8000/',
    'deshorten': function deshorten(links) {
        var urls  = links.map(getHref),
            table = $H(links.associate(urls)),
            req   = new Request.JSONP ({
                url: Twitter['deshortenUrl'],
                data: { 'short': urls.join(',') },
                onComplete: callBack
            });

        req.send();

        function getHref(o) { return o.get('href'); }

        function callBack (json) {
            $H(json).each(
                function(longUrl, shortUrl){
                    var oldLink = table.get(shortUrl),
                        newLink = new Element('a', {
                            'href': longUrl,
                            'text': longUrl
                        });

                    newLink.replaces(oldLink);
                });
        }
    }
});

Twitter.templates.extend({
    'deshortened': function (tweet) {
        var html = Twitter.templates.basic(tweet),
            links = html.getElements('a'),
            shorts = links.filter(isShortened);

        deshorten(shorts);
        return html;

        function isShortened(link) {
            var domain = new URI(link.get('href')).get('host');
            return Twitter.urlShorteners.contains(domain);
        }
    }
});

Twitter.extend({
    'videoSites': $H({
        'twitvid.com': {
            'embed': 'http://www.twitvid.com/player/{code}',
            'height': 344,
            'width': 425
        },

        'vid.ly': {
            'embed': 'http://www.vidly.com/embed/{code}',
            'height': 344,
            'width': 425
        }
    }),

    'expandVideos': function (html) {
        html.getElements('a').each(function (link) {
            var url = new URI(link.get('href')),
                domain = url.get('host'),
                code = url.get('file');

            if (Twitter.videoSites.has(domain)) {
                makeEmbed(Twitter.videoSites.get(domain), code);
            }
        });
    
        function makeEmbed(site, id) {
            var src = site.embed.substitute({'code': id});

            html.adopt(
                new Swiff(src, {
                    'height': site.height,
                    'width': site.width,
                    'wmode': 'transparent'
                }));
        }

        return html;
    }
});

Twitter.templates.extend({
    'videos': compose(Twitter.expandVideos, Twitter.templates.basic)
});

Twitter.templates.extend({
    'allTheTrimmings': compose(Twitter.expandVideos, Twitter.expandImageLinks, Twitter.templates.basic)
});
