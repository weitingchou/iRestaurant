var express = require('express');
var https = require('https');
var Q = require('q');

var router = express.Router;
var foursquare = {
    clientId: '4PE40GCZEXZHXNKO2DYW11HIMSIT4054GW5H1CM12JYMNUQJ',
    clientSecret: 'KGMG5BLMV50KUR0OOPKTTTOFMLU2TGEC3WOW2FDNBRIW5ZRJ'
};

router.get('/restaurant', function(req, res) {
    var search = req.query.search;

    res.send(
        Q.fcall(function() {
            var options = {
                hostname: 'api.foursquare.com',
                port: 443,
                path: '/v2/venues/search?query=' + encodeURIComponent(search) +
                    '&intent=global' +
                    '&client_id=' + foursquare.clientId +
                    '&client_secret=' + foursquare.clientSecret +
                    '&v=20150315',
                method: 'GET'
            };
            var req = https.request(options, function(res) {
                res.on('data', function(data) {
                    console.log(data);
                    var result = JSON.parse(data);
                    if (result.response.venues === 'undefined' ||
                        result.response.venues.length === 0) {
                        return new Error('No restaurant found!');
                    }
                    return result;
                });
            });
            req.end();

            req.on('error', function(e) {
                console.log(e);
                return new Error(e);
            });
        })
        .then(function (venue) {
            console.log(venue);
        })
        .catch(function(err) {
            console.log('Failed to find the restaurant! ERRMSG: '+err);
            res.status(404).send('Not Found!');
        })
        .done();
    );
});

module.exports = router;
