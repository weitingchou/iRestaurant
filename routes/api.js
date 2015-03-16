var express = require('express');
var https = require('https');
var Q = require('q');
var async = require('async');

var AlchemyAPI = require('./alchemyapi');
var alchemyapi = new AlchemyAPI();

var router = express.Router();
var foursquare = {
    clientId: '4PE40GCZEXZHXNKO2DYW11HIMSIT4054GW5H1CM12JYMNUQJ',
    clientSecret: 'KGMG5BLMV50KUR0OOPKTTTOFMLU2TGEC3WOW2FDNBRIW5ZRJ'
};

router.get('/restaurant', function(req, res) {
    var searchName = req.query.search;

    searchRestaurantIdByName(searchName)
    .then(getRestaurantTips)
    .then(analysisTips)
    .then(function(result) {
        res.send(result);
    })
    .catch(function(err) {
        console.log('Failed to find the restaurant! ERRMSG: '+err);
        res.status(404).end('Not Found!');
    })
    .done();
});

var searchRestaurantIdByName = function(name) {
    console.log('[searchRestaurantIdByName] search name: '+name);
    var deferred = Q.defer();
    var options = {
        host: 'api.foursquare.com',
        port: 443,
        path: '/v2/venues/search?query=' + encodeURIComponent(name) +
            '&intent=global' +
            '&client_id=' + foursquare.clientId +
            '&client_secret=' + foursquare.clientSecret +
            '&v=20150315',
        headers: {
            Accept: '*/*'
        },
        method: 'GET'
    };
    var req = https.request(options, function(res) {
        console.log('[searchRestaurantIdByName] response: '+res.statusCode);
        var str = '';
        res.on('data', function(data) {
            str += data;
        });
        res.on('end', function() {
            console.log('[searchRestaurantIdByName] response: '+str);
            var error = new Error('No restaurant found!');
            var result = JSON.parse(str);
            var restaurantList = result.response.venues;
            if (restaurantList === 'undefined' ||
                restaurantList.length === 0) {
                deferred.reject(error);
            }
            else {
                var id = null;
                restaurantList.forEach(function(restaurant) {
                    console.log('restaurant name: '+restaurant.name);
                    if (restaurant.name === name) {
                        id = restaurant.id;
                    }
                });
                if (id) {
                    deferred.resolve(id);
                }
                else {
                    deferred.reject(error);
                }
            }
        });
        res.on('error', function(e) {
            console.log('[searchRestaurantIdByName]: '+e);
            deferred.reject(new Error(e));
        });
    });
    req.end();
    req.on('error', function(e) {
        console.log(e);
        deferred.reject(new Error(e));
    });
    return deferred.promise;
};

var getRestaurantTips = function(resId) {
    console.log('[getRestaurantTips] input id: '+resId);
    var deferred = Q.defer();
    var options = {
        host: 'api.foursquare.com',
        port: 443,
        path: '/v2/venues/' + resId + '/tips?' +
            '&sort=recent' +
            '&limit=500' +
            '&client_id=' + foursquare.clientId +
            '&client_secret=' + foursquare.clientSecret +
            '&v=20150315',
        headers: {
            Accept: '*/*'
        },
        method: 'GET'
    };
    var req = https.request(options, function(res) {
        var str = '';
        res.on('data', function(data) {
            str += data;
        });
        res.on('end', function() {
            console.log('[getRestaurantTips] response: '+str);
            var error = new Error('No tips found!');
            var result = JSON.parse(str);
            var tips = result.response.tips;
            if (tips === 'undefined' ||
                tips.count === 0) {
                deferred.reject(error);
            }
            else {
                tipText = '';
                tips.items.forEach(function(tip) {
                    text = '"'+tip.user.firstName+' said '+tip.text+'."';
                    tipText += text + '\n';
                });
                deferred.resolve(tipText);
            }
        });
        res.on('error', function(e) {
            console.log('[getRestaurantTips]: '+e);
            deferred.reject(new Error(e));
        });
    });
    req.end();
    req.on('error', function(e) {
        console.log(e);
        deferred.reject(new Error(e));
    });
    return deferred.promise;
};

var analysisTips = function(tips) {
    var deferred = Q.defer();
    async.parallel([
        function(callback) {
            alchemyapi.keywords('text', tips, { 'sentiment': 1 }, function(res) {
                callback(null, JSON.stringify(res.keywords));
            });
        },
        function(callback) {
            alchemyapi.entities('text', tips, { 'sentiment': 1 }, function(res) {
                callback(null, JSON.stringify(res.entities));
            });
        }
    ],
    function(err, result) {
        if (err) { deferred.reject(err); }
        deferred.resolve(JSON.stringify({keywords: result[0], entities: result[1]}));
    });
    return deferred.promise;
};

module.exports = router;
