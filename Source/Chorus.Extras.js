/*
---
description: Expands various media links to images/videos to embedded objects and thumbnails etc. 

license: BSD-style

authors:
- Gerard Paapu

requires:
- Chorus
- more/1.2.4: [URI]
- core/1.2.4: [Swiff]

provides: [Chorus.Extras]
*/

(function (Chorus){
    Chorus.extend({
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
                site   = Chorus['imageSites'].get(domain),
                tsize  = (size === "mini") ? size : "thumb",
                src    = site && site.substitute({'id': id, 'size': tsize});

            return src && new Element('a', {'href': link, 'class': 'thumbnail'}).grab(new Element('img', {
                'src': "http://{0}/{1}".substitute([domain, src]),
                'alt': 'thumbnail provided by ' + domain
            }));
        },

        'expandImageLinks': function (html) {
            var thumbs = html.getElements('a')
                    .map(function (link) {
                        return Chorus.imageLinkToThumbnail(link, 'thumb')
                    })
                    .filter($arguments(0));

            return html.adopt(thumbs);
        }
    });

    Chorus.templates.extend({
        'imagethumbs': function (twitter) {
            var html = Chorus.templates.basic(twitter);
            return Chorus.expandImageLinks(html);
        }
    });

    Chorus.extend({
        'urlShorteners': ['bit.ly', 'tinyurl.com', 'is.gd', 'tr.im', 'ow.ly'],
        'deshortenUrl': 'http://thecyberplains.com:8000/',
        'deshorten': function deshorten(links) {
            var urls  = links.map(getHref),
                table = $H(links.associate(urls)),
                req   = new Request.JSONP ({
                    url: Chorus['deshortenUrl'],
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

    Chorus.templates.extend({
        'deshortened': function (tweet) {
            var html = Chorus.templates.basic(tweet),
                links = html.getElements('a'),
                shorts = links.filter(isShortened);

            Chorus.deshorten(shorts);
            return html;

            function isShortened(link) {
                var domain = new URI(link.get('href')).get('host');
                return Chorus.urlShorteners.contains(domain);
            }
        }
    });

    Chorus.extend({
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
            if (Browser.Plugins.Flash.version) html.getElements('a').each(function (link) {
                var url = new URI(link.get('href')),
                    domain = url.get('host'),
                    code = url.get('file');

                if (Chorus.videoSites.has(domain)) {
                    makeEmbed(Chorus.videoSites.get(domain), code);
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

    Chorus.templates.extend({
        'videos': function (tweet) {
            var html = Chorus.templates.basic(tweet);
            return Chorus.expandVideos(html);
        }
    });

    Chorus.templates.extend({
        'images+video': function (tweet) {
            var html = Chorus.templates.imagethumbs(tweet);
            return Chorus.expandVideos(html);
        },

        'deluxe': function (tweet) {
            var html = Chorus.templates.deshortened(tweet);
            
            html = Chorus.expandVideos(html);
            html = Chorus.expandImageLinks(html);

            return html;
        }
    });
}(Chorus));
