
/*
 * GET users listing.
 */
var passport = require('passport');
var Account = require('../models/account');

exports.list = function(req, res){
  res.send("respond with a resource");
};

exports.register = function(req, res) {
    Account.register(new Account({username : req.body.username}), req.body.password, function(err, account) {
        if (err) {
            res.send({status: 'error'});
        }

        passport.authenticate('local')(req, res, function () {
            var query = {username: req.body.username};

            // Remove plaintext password
            delete req.body.password;

            Account.findOneAndUpdate(query, req.body, function(err, doc) {
                if (err) {
                    res.send({status: 'error'});
                }

                res.send({status: 'success'});
            });

        });
    });
};