
/*
 * handle app pages.
 */

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

exports.index = function(req, res){
    var url = require('url'),
        url_parts = url.parse(req.url, true),
        _ = require('underscore');

    if (req.session.user) {
        res.redirect('/dashboard');
        return;
    }
    res.render('app/index.html', {
        title: 'welcome'
    });
};

