
/*
 * GET users listing.
 */
var passport = require('passport');
var Account = require('../models/account');
var Group = require('./group');

exports.list = function(req, res){
  res.send("respond with a resource");
};

exports.register = function(req, res) {
    var username = req.body.username;
    Account.register(new Account({username : username}), req.body.password, function(err, account) {
        if (err) {
            console.log(err);
            res.send({status: 'error', msg: err.message});
        }

        passport.authenticate('local')(req, res, function () {
            var query = {username: username};

            // Remove plaintext password
            delete req.body.password;

            Account.findOneAndUpdate(query, req.body, function(err, doc) {
                if (err) {
                    res.send({status: 'error'});
                }

                Account.count({}, function(err, count) {
                    if (err) {
                        res.send({status: 'error'});
                    }

                    // If this is the first user, add him to admin group
                    console.log("Count: %d", count);
                    if (count == 1) {
                        Group.create_admin_group(username, function() {
                            res.send({status: 'success'});
                        });
                    } else {
                        res.send({status: 'success'});
                    }
                });

            });

        });
    });
};

exports.get = function(req, res) {
    Account.find({}, {username: 1}, function(err, docs) {
        if (err) {
            res.send({status: 'error'});
        }

        res.send({status: 'success', data: docs});

    });
};