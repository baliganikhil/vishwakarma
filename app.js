/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var fs = require('fs');

/*********************************************************************************************************/
// Load Config and do some things
/*********************************************************************************************************/
var config_default = JSON.parse(fs.readFileSync('config.default').toString());
var config_local = {};
try {
    config_local = JSON.parse(fs.readFileSync('config.local').toString())
} catch(e) {
    console.log('Failed trying to load Local config data - using default instead');
}

// Need to use prototype and fix this ugly mess eventually
var mongo_server =  noe(coalesce(coalesce(config_local, 'mongo', {}), 'server', '')) ? config_default.mongo.server : config_local.mongo.server;
var mongo_port =  noe(coalesce(coalesce(config_local, 'mongo', {}), 'port', '')) ? config_default.mongo.port : config_local.mongo.port;
var server_port =  noe(coalesce(coalesce(config_local, 'server', {}), 'port', '')) ? config_default.server.port : config_local.server.port;
var local_server =  noe(coalesce(coalesce(config_local, 'local', {}), 'server', '')) ? config_default.local.server : config_local.local.server;
var local_port =  noe(coalesce(coalesce(config_local, 'local', {}), 'port', '')) ? config_default.local.port : config_local.local.port;
var logs_save =  noe(coalesce(coalesce(config_local, 'logs', {}), 'save', '')) ? config_default.logs.save : config_local.logs.save;
var logs_path =  noe(coalesce(coalesce(config_local, 'logs', {}), 'path', '')) ? config_default.logs.path : config_local.logs.path;

fs.writeFileSync('./public/javascripts/config.js', 'var CONFIG = ' + JSON.stringify({server: local_server}));

/*********************************************************************************************************/

var mongoose = require('mongoose');
var accountAPI = require('./routes/account');
var projects = require('./routes/projects');
var project_log = require('./routes/project_log');
var groups = require('./routes/group');

var app = express();
mongoose.connect('mongodb://' + mongo_server + '/vishwakarma');

// all environments
app.set('port', process.env.NODE_PORT || server_port || 80);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session({
    secret: 'keyboard cat'
}));

app.use(express.bodyParser());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.get('/', function (req, resp) {
    resp.sendfile(__dirname + '/public/vishwakarma.html')
});

app.post('/login', accountAPI.login);
app.get('/authenticated', accountAPI.authenticated);
app.get('/logout', accountAPI.logout);
app.post('/accounts/register', accountAPI.register);
app.post('/accounts/reset', accountAPI.reset_password);
app.get('/users', accountAPI.get);

app.get('/:username/projects', projects.get);
app.get('/projects/:id', projects.get_project);
app.post('/projects/save', projects.save);
app.del('/projects/:_id/remove', projects.remove);

app.get('/projects/:project/groups', groups.get_groups_for_project);
app.post('/projects/project/groups/add', groups.add_groups_to_project);

app.get('/logs', project_log.get);
app.get('/logs/:id', project_log.get_log);

app.get('/groups', groups.get);
app.post('/groups/save', groups.save);
app.get('/groups/:group/users', groups.get_users_for_group);
app.post('/groups/users/add', groups.add_users_to_group);

/*******************/

var socket_config = {
	logs_save: logs_save,
	logs_path: logs_path
};

var server = http.createServer(app);
var socketServer = require('./socket_server.js')(server, socket_config);

server.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});

// helper functions
function coalesce(obj, key, default_value) {
    return obj.hasOwnProperty(key) ? obj[key] : default_value;
}

function noe(i) {
    return [undefined, null, ''].indexOf(i) > -1;
}