
/*
 * GET users listing.
 */
var Account = require('../models/account');
var Group = require('./group');

exports.list = function(req, res){
  res.send("respond with a resource");
};

exports.get = function(req, res) {
    Account.find({}, {username: 1}, function(err, docs) {
        if (err) {
            res.send({status: 'error'});
        }

        res.send({status: 'success', data: docs});

    });
};
