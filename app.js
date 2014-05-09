
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

var app = express();
mongoose.connect('mongodb://localhost/vishwakarma');

// all environments
app.set('port', process.env.PORT || 3000);
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

// passport config
var Account = require('./models/account');
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

app.get('/', routes.index);

app.post('/login', function(req, res, next) {

    passport.authenticate('local', function(err, user) {
        if (user) {
            console.log('user logged in');
            res.send({status: 'success'});
        } else {
            res.send({status: 'error'});
        }
    })(req, res, next);

});

app.post('/accounts/register', accountAPI.register);
app.get('/users', accountAPI.get);

app.get('/:username/projects', projects.get);
app.get('/projects/:id', projects.get_project);
app.post('/projects/save', projects.save);
app.get('/projects/:project/groups', groups.get_groups_for_project);
app.post('/projects/project/groups/add', groups.add_groups_to_project);

app.get('/logs', project_log.get);
app.get('/logs/:id', project_log.get_log);

app.get('/groups', groups.get);
app.post('/groups/save', groups.save);
app.get('/groups/:group/users', groups.get_users_for_group);
app.post('/groups/users/add', groups.add_users_to_group);


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
