var bcrypt = require('bcrypt');

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

exports.login = function(req, res) {
	var username = req.body.username;
    var password = req.body.password;

    Account.findOne({username: username}, function(err, doc) {
		if (err) {
			res.status(500);
			res.send({status: 'error', data: 'Could not fetch user'});
			return false;
		}

		if (doc === null) {
			res.status(401)
			res.send({status: 'error', data: 'Could not find user'});
			return false;
		}

		bcrypt.compare(password, doc.hash, function (err, result) {
			if (!result) {
				res.status(401)
				res.send({status: 'error', data: 'Authentication failed'});
				return false;
			}

			Group.v_get_users_for_group('admin', function (data) {
	            var is_admin = data.users.indexOf(username) > -1;

	            res.cookie('__auth', doc.hash);
	            res.cookie('username', username);

	            res.send({
	                status: 'success',
	                is_admin: is_admin
	            });
	        });
        });



	});

};

exports.authenticated = function(req, res) {
    var username = req.cookies.username;
    var __auth = req.cookies.__auth;

    authenticate(username, __auth, function (err, response) {
        if (err) {
            res.send({err: true});
            return;
        }

        if (!response.authenticated) {
            res.cookie('__auth', '');
            res.cookie('username', '');

            res.send({status: 'error'});
            return;
        }

        Group.v_get_users_for_group('admin', function (data) {
            var is_admin = data.users.indexOf(username) > -1;

            res.send({
                status: 'success',
                is_admin: is_admin,
                username: username
            });
        });

    });
};

exports.logout = function(req, res) {
	res.cookie('__auth', '');
    res.cookie('username', '');
    res.send({
        status: 'success'
    });
};

exports.register = function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var is_bootstrap = req.body.is_bootstrap;

    register(username, password, function (err, response) {
        if (err) {
            res.send({
                err: true
            });
            return;
        }

        if (is_bootstrap) {
            var group = require('./routes/group');
            group.create_admin_group(username, function () {});
        }

        res.send(response);
    });
};

exports.reset_password = function (req, res) {
    // Reset Password
    var username = req.cookies.username;
    var __auth = req.cookies.__auth;

    var password = req.body.password;
    var new_password = req.body.new_password;

    authenticate(username, __auth, function (err, response) {
        if (err) {
            res.send({
                err: true
            });
            return;
        }

        if (!response.authenticated) {
            res.cookie('__auth', '');
            res.cookie('username', '');

            res.status(401);
            res.send({status: 'error'});
            return;
        }

        bcrypt.compare(password, __auth, function (err, result) {
            if (!result) {
                res.cookie('__auth', '');
                res.cookie('username', '');

                res.status(401);
                res.send({status: 'error'});
                return;
            }

            function callback(err, response) {
                if (err) {
                    res.send({status: 'error'});
                } else {
                    res.send(response);
                }
            }

            create_auth_token(username, new_password, function (hash) {

            	Account.findOneAndUpdate({username: username}, {hash: hash}, function(err, doc) {
					callback(err, {success: true});
            	});

            });
        });

    });
};

function create_auth_token(username, password, callback) {
    bcrypt.hash(password, 8, function (err, hash) {
        callback(hash);
    });
}

function register(username, password, callback) {
    create_auth_token(username, password, function (hash) {

        var doc = {
            username: username,
            hash: hash,
            confirmed: false
        };

        (new Account(doc)).save(function(err, doc) {
            if (err) {
                callback(err);
                return;
            }

            callback(false, {success: true});
        });

    });
}

function authenticate(username, hash, callback) {

	Account.findOne({username: username, hash: hash}, function(err, doc) {
		if (err) {
			callback(err);
			return false;
		}

		if (doc === null) {
			callback(err, {authenticated: false});
			return false;
		}

		callback(false, {authenticated: true});

	});
}