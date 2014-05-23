
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');

var mongoose = require('mongoose');
var accountAPI = require('./routes/account');
var projects = require('./routes/projects');
var project_log = require('./routes/project_log');
var groups = require('./routes/group');

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash');

var MongoClient = require('mongodb').MongoClient;
var bcrypt = require('bcrypt');

var app = express();
mongoose.connect('mongodb://localhost/vishwakarma');

// all environments
app.set('port', 80);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session({secret: 'keyboard cat'}));
app.use(flash());
app.use(express.bodyParser());
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

/* CONSTANTS */
var COLL_USERS = 'users';

// passport config
var Account = require('./models/account');
passport.use(new LocalStrategy(Account.authenticate()));

app.get('/', function(req,resp){resp.sendfile(__dirname+'/public/vishwakarma.html')});
passport.serializeUser(function(user, done) {
    console.log('===== serialise ' + user)
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    console.log('=====  deserialise' + username);

    done(null, obj);
});
app.post('/login', function(req, res, next) {

    // passport.authenticate('local', function(err, user) {
    //     if (user) {

    //         var username = user.username;

    //         groups.v_get_users_for_group('admin', function(data) {
    //             var is_admin = data.users.indexOf(username) > -1;

    //             res.send({status: 'success', is_admin: is_admin});
    //         });

    //     } else {
    //         res.send({status: 'error'});
    //     }
    // })(req, res, next);

    var username = req.body.username;
    var password = req.body.password;

    login(username, password, function(err, response) {
        if (err) {
            res.send({status: 'error'});
            return;
        }

        groups.v_get_users_for_group('admin', function(data) {
            var is_admin = data.users.indexOf(username) > -1;

            res.send({status: 'success', is_admin: is_admin});
        });

    });

});

app.get('/is_authenticated', function(req, res) {
    console.log('+++++', req.session)
    if (req.user) {
        res.send({authenticated: true});
    } else {
        res.send({authenticated: false});
    }
});

app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

// app.post('/accounts/register', accountAPI.register);

app.post('/accounts/register', function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    console.log(req.body);

    register(username, password, function(err, response) {
        if (err) {
            res.send({err: true});
            return;
        }

        res.send(response);
    });
});


app.get('/users', accountAPI.get);

app.get('/:username/projects', projects.get);
app.get('/projects/:id', projects.get_project);
app.post('/projects/save', projects.save);
app.del('/projects/:_id/remove', projects.remove);

app.get('/projects/:project/groups', groups.get_groups_for_project);
app.post('/projects/project/groups/add', groups.add_groups_to_project);

app.get('/logs', passport.authenticate('local', { failureRedirect: '/' }), project_log.get);
app.get('/logs/:id', project_log.get_log);

app.get('/groups', groups.get);
app.post('/groups/save', groups.save);
app.get('/groups/:group/users', groups.get_users_for_group);
app.post('/groups/users/add', groups.add_users_to_group);






function create_auth_token(username, password, callback) {
    bcrypt.hash(password, 8, function(err, hash) {
        callback(hash);
    });
}

function login(username, password, callback) {
    get_collection(COLL_USERS, function(err, coll) {
        if (err) {
            callback(err);
            return;
        }

        coll.findOne({username: username}, {hash: 1}, function(err, doc) {
            bcrypt.compare(password, doc.hash, function(err, result) {
                callback(err, result);
            });
        });
    });
}

function register(username, password, callback) {
    create_auth_token(username, password, function(hash) {
        get_collection(COLL_USERS, function(err, coll) {
            if (err) {
                callback(err);
                return;
            }

            var doc = {
                username: username,
                hash: hash,
                confirmed: false
            };

            coll.save(doc, function(err, doc) {
                callback(false, {success: true});
            });
        });
    });
}

function authenticate(username, hash, callback) {

}

/*******************/
function mongo_connect(callback) {
    MongoClient.connect('mongodb://127.0.0.1:27017/vishwakarma', function(err, db) {
        callback(err, db);
    });
}

function get_collection(collection, callback) {
    mongo_connect(function(err, db) {
        if (err) {
            callback(err);
            return;
        }

        db.collection(collection, callback);
    });
}












http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
