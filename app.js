/**
 * Module dependencies.
 */

var express = require( 'express' );
var routes = require( './routes' );
var http = require( 'http' );
var path = require( 'path' );
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

fs.writeFileSync('./public/javascripts/config.js', 'var CONFIG = ' + JSON.stringify({server: local_server}));

/*********************************************************************************************************/





var mongoose = require( 'mongoose' );
var accountAPI = require( './routes/account' );
var projects = require( './routes/projects' );
var project_log = require( './routes/project_log' );
var groups = require( './routes/group' );

var flash = require( 'connect-flash' );

var MongoClient = require( 'mongodb' ).MongoClient;
var bcrypt = require( 'bcrypt' );

var app = express( );
mongoose.connect( 'mongodb://' + mongo_server + '/vishwakarma' );

// all environments
app.set( 'port', process.env.NODE_PORT || server_port || 80);
app.set( 'views', path.join( __dirname, 'views' ) );
app.set( 'view engine', 'jade' );
app.use( express.favicon( ) );
app.use( express.logger( 'dev' ) );
app.use( express.json( ) );
app.use( express.urlencoded( ) );
app.use( express.methodOverride( ) );
app.use( express.cookieParser( 'your secret here' ) );
app.use( express.session( {
    secret: 'keyboard cat'
} ) );
app.use( flash( ) );
app.use( express.bodyParser( ) );
app.use( app.router );
app.use( express.static( path.join( __dirname, 'public' ) ) );

// development only
if ( 'development' == app.get( 'env' ) ) {
    app.use( express.errorHandler( ) );
}

/* CONSTANTS */
var COLL_USERS = 'users';

app.get( '/', function ( req, resp ) {
    resp.sendfile( __dirname + '/public/vishwakarma.html' )
} );

app.post( '/login', function ( req, res, next ) {

    var username = req.body.username;
    var password = req.body.password;

    login( username, password, function ( err, response ) {
        if ( err || !response.success ) {
            res.send( {
                status: 'error'
            } );
            return;
        }

        console.log( "response" );
        console.log( response );

        groups.v_get_users_for_group( 'admin', function ( data ) {
            var is_admin = data.users.indexOf( username ) > -1;

            res.cookie( '__auth', response.doc.hash )
            res.cookie( 'username', username )

            res.send( {
                status: 'success',
                is_admin: is_admin
            } );
        } );

    } );

} );

app.get( '/authenticated', function ( req, res ) {
    console.log( req.cookies );

    var username = req.cookies.username;
    var __auth = req.cookies.__auth;

    authenticate( username, __auth, function ( err, response ) {
        if ( err ) {
            res.send( {
                err: true
            } );
            return;
        }

        if ( !response.authenticated ) {
            res.cookie( '__auth', '' );
            res.cookie( 'username', '' );

            res.send( {
                status: 'error'
            } );
            return;
        }

        groups.v_get_users_for_group( 'admin', function ( data ) {
            var is_admin = data.users.indexOf( username ) > -1;

            res.send( {
                status: 'success',
                is_admin: is_admin,
                username: username
            } );
        } );

    } );
} );

app.get( '/logout', function ( req, res ) {
    res.cookie( '__auth', '' );
    res.cookie( 'username', '' );
    res.send( {
        status: 'success'
    } );
} );

app.post( '/accounts/register', function ( req, res ) {
    var username = req.body.username;
    var password = req.body.password;
    var is_bootstrap = req.body.is_bootstrap;

    register( username, password, function ( err, response ) {
        if ( err ) {
            res.send( {
                err: true
            } );
            return;
        }

        if ( is_bootstrap ) {
            var group = require( './routes/group' );
            group.create_admin_group( username, function ( ) {} );
        }

        res.send( response );
    } );
} );

app.post( '/accounts/reset', function ( req, res ) {
    // Reset Password
    var username = req.cookies.username;
    var __auth = req.cookies.__auth;

    var password = req.body.password;
    var new_password = req.body.new_password;

    authenticate( username, __auth, function ( err, response ) {
        if ( err ) {
            res.send( {
                err: true
            } );
            return;
        }

        if ( !response.authenticated ) {
            res.cookie( '__auth', '' );
            res.cookie( 'username', '' );

            res.send( {
                status: 'error'
            } );
            return;
        }

        bcrypt.compare( password, __auth, function ( err, result ) {
            if ( !result ) {
                res.cookie( '__auth', '' );
                res.cookie( 'username', '' );

                res.send( {
                    status: 'error'
                } );
                return;
            }

            function callback( err, response ) {
                if ( err ) {
                    res.send( {
                        status: 'error'
                    } );
                } else {
                    res.send( response );
                }
            }

            create_auth_token( username, new_password, function ( hash ) {
                get_collection( COLL_USERS, function ( err, coll ) {
                    if ( err ) {
                        callback( err );
                        return;
                    }

                    var doc = {
                        username: username,
                        hash: hash,
                        confirmed: false
                    };

                    coll.update( {
                        username: username
                    }, {
                        '$set': {
                            hash: hash
                        }
                    }, function ( err, doc ) {
                        callback( false, {
                            success: true
                        } );
                    } );
                } );
            } );
        } );

    } );
} );


app.get( '/users', accountAPI.get );

app.get( '/:username/projects', projects.get );
app.get( '/projects/:id', projects.get_project );
app.post( '/projects/save', projects.save );
app.del( '/projects/:_id/remove', projects.remove );

app.get( '/projects/:project/groups', groups.get_groups_for_project );
app.post( '/projects/project/groups/add', groups.add_groups_to_project );

app.get( '/logs', project_log.get );
app.get( '/logs/:id', project_log.get_log );

app.get( '/groups', groups.get );
app.post( '/groups/save', groups.save );
app.get( '/groups/:group/users', groups.get_users_for_group );
app.post( '/groups/users/add', groups.add_users_to_group );


function create_auth_token( username, password, callback ) {
    bcrypt.hash( password, 8, function ( err, hash ) {
        callback( hash );
    } );
}

function login( username, password, callback ) {
    get_collection( COLL_USERS, function ( err, coll ) {
        if ( err ) {
            callback( err );
            return;
        }

        coll.findOne( {
            username: username
        }, {
            hash: 1
        }, function ( err, doc ) {
            if ( err ) {
                callback( err );
                return;
            }

            if ( !doc || doc.length == 0 ) {
                callback( err, {
                    success: false
                } );
                return;
            }

            bcrypt.compare( password, doc.hash, function ( err, result ) {
                callback( err, {
                    success: result,
                    doc: doc
                } );
            } );
        } );
    } );
}

function register( username, password, callback ) {
    create_auth_token( username, password, function ( hash ) {
        get_collection( COLL_USERS, function ( err, coll ) {
            if ( err ) {
                callback( err );
                return;
            }

            var doc = {
                username: username,
                hash: hash,
                confirmed: false
            };

            coll.save( doc, function ( err, doc ) {
                callback( false, {
                    success: true
                } );
            } );
        } );
    } );
}

function authenticate( username, hash, callback ) {
    get_collection( COLL_USERS, function ( err, coll ) {
        if ( err ) {
            callback( err );
            return;
        }

        coll.find( {
            username: username,
            hash: hash
        } ).toArray( function ( err, docs ) {
            if ( err ) {
                callback( err );
                return;
            }

            console.log( JSON.stringify( docs ) );

            callback( false, {
                authenticated: ( docs.length == 1 )
            } );
        } );
    } );
}

/*******************/

function mongo_connect( callback ) {
    MongoClient.connect( 'mongodb://' + mongo_server + ':' + mongo_port + '/vishwakarma', function ( err, db ) {
        callback( err, db );
    } );
}

function get_collection( collection, callback ) {
    mongo_connect( function ( err, db ) {
        if ( err ) {
            callback( err );
            return;
        }

        db.collection( collection, callback );
    } );
}

var server = http.createServer( app );

var socketServer = require( './socket_server.js' )(server);

/*************/
/*HTTP SERVER*/
/*************/

server.listen( app.get( 'port' ), function ( ) {
    console.log( 'Express server listening on port ' + app.get( 'port' ) );
} );


// helper functions
function coalesce(obj, key, default_value) {
    if (obj.hasOwnProperty(key)) {
        return obj[key];
    } else {
        return default_value;
    }
}

function noe(i) {
    return [undefined, null, ''].indexOf(i) > -1;
}