/**
 * Module dependencies.
 */

var express = require( 'express' );
var routes = require( './routes' );
var http = require( 'http' );
var path = require( 'path' );

var mongoose = require( 'mongoose' );
var accountAPI = require( './routes/account' );
var projects = require( './routes/projects' );
var project_log = require( './routes/project_log' );
var groups = require( './routes/group' );

var flash = require( 'connect-flash' );

var MongoClient = require( 'mongodb' ).MongoClient;
var bcrypt = require( 'bcrypt' );

var app = express( );
mongoose.connect( 'mongodb://localhost/vishwakarma' );

// all environments
app.set( 'port', 80 );
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
    MongoClient.connect( 'mongodb://127.0.0.1:27017/vishwakarma', function ( err, db ) {
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

var socketServer = require( './socket_server.js' )( server );
// ////////////////////////////////////////////////////////
// //////////////////// SOCKET.IO /////////////////////////
// ////////////////////////////////////////////////////////

// io = require( 'socket.io' )( server );
// spawn = require( 'child_process' ).spawn;
// Project = require( './models/projects.js' );
// fs = require( 'fs' );
// var kill = require( 'tree-kill' );

// running_processes = {};
// scheduled_processes = {};

// var STATUS = {
//     completed: 'completed',
//     running: 'running',
//     error: 'error',
//     aborted: 'aborted'
// };

// function nullOrEmpty( input ) {
//     return [ undefined, null, '' ].indexOf( input ) > -1;
// }

// io.sockets.on( 'connection', function ( socket ) {

//     socket.on( 'exec', function ( data ) {
//         execute_project( data );
//     } );

//     function execute_project( data ) {
//         var _id = data._id;

//         Project.findOne( {
//             _id: _id
//         }, function ( err, doc ) {
//             if ( err ) {
//                 console.log( 'ERROR' + err );
//                 return;
//             }

//             if ( doc == null ) {
//                 console.log( ' === doc is null === ' + _id );
//                 return;
//             }

//             var code = doc.code;
//             var temp_file_name = Math.random( ).toString( ).slice( 4 ) + '.sh';

//             fs.writeFile( temp_file_name, code, function ( err ) {
//                 execute( temp_file_name, doc, data );
//             } );

//         } );

//         function execute( filename, doc, extra_data ) {
//             var prog = spawn( 'bash', [ filename ] );

//             running_processes[ doc._id ] = {
//                 project_id: doc._id,
//                 prog: prog,
//                 name: doc.name,
//                 filename: filename,
//                 status: STATUS.running,
//                 stdout: [ ],
//                 created_at: new Date( ),
//                 created_by: extra_data.created_by
//             };

//             socket.emit( 'proj_start', {
//                 name: doc.name,
//                 filename: filename,
//                 status: STATUS.running,
//                 _id: doc._id
//             } );
//             socket.broadcast.emit( 'proj_start', {
//                 name: doc.name,
//                 filename: filename,
//                 status: STATUS.running,
//                 _id: doc._id
//             } );

//             prog.stdout.setEncoding( 'utf8' );
//             prog.stdout.on( 'data', function ( data ) {

//                 running_processes[ doc._id ].stdout.push( data );

//                 var payload = {
//                     name: doc.name,
//                     filename: filename,
//                     stdout: data,
//                     status: STATUS.running,
//                     _id: doc._id
//                 };
//                 socket.emit( 'stdout', payload );
//                 socket.broadcast.emit( 'stdout', payload );

//             } );

//             prog.stderr.setEncoding( 'utf8' );
//             prog.stderr.on( 'data', function ( data ) {
//                 var payload = {
//                     name: doc.name,
//                     filename: filename,
//                     stdout: data,
//                     _id: doc._id
//                 };
//                 socket.emit( 'stdout', payload );
//                 socket.broadcast.emit( 'stdout', payload );

//                 running_processes[ doc._id ].stdout.push( data );
//             } );

//             prog.on( 'close', function ( code ) {
//                 var stdout = '';
//                 if ( running_processes[ doc._id ].status != STATUS.aborted ) {
//                     running_processes[ doc._id ].status = STATUS.completed;
//                     stdout = '=== COMPLETED ===';
//                 }

//                 var payload = {
//                     name: doc.name,
//                     filename: filename,
//                     status: running_processes[ doc._id ].status,
//                     _id: doc._id,
//                     stdout: stdout
//                 };
//                 socket.emit( 'proj_done', payload );
//                 socket.broadcast.emit( 'proj_done', payload );

//                 fs.unlink( filename, function ( err ) {
//                     if ( err ) {
//                         return false;
//                     }
//                 } );

//                 write_proj_to_log( doc._id );

//                 if ( !nullOrEmpty( doc.next ) && running_processes[ doc._id ].status == STATUS.completed ) {
//                     console.log( "===== " + doc.next );
//                     execute_project( {
//                         _id: doc.next,
//                         created_by: running_processes[ doc._id ]
//                     } );
//                 }
//             } );
//         }
//     }

//     socket.on( 'kill', function ( data ) {
//         var _id = data._id;

//         console.log( "====>  " + Object.keys( running_processes[ _id ] ) );

//         kill( running_processes[ _id ].prog.pid, 'SIGQUIT' );
//         running_processes[ _id ].stdout.push( '=== ABORTED ===' );
//         running_processes[ _id ].status = STATUS.aborted;
//         running_processes[ _id ].aborted_by = data.aborted_by;
//         running_processes[ _id ].aborted_at = new Date( );

//         fs.unlink( running_processes[ _id ].filename, function ( err ) {
//             if ( err ) {
//                 return false;
//             }
//         } );

//         var payload = {
//             status: STATUS.aborted,
//             _id: _id,
//             stdout: '=== ABORTED by ' + data.aborted_by + ' at ' + running_processes[ _id ].aborted_at + ' ==='
//         };
//         socket.emit( 'proj_done', payload );
//         socket.broadcast.emit( 'proj_done', payload );

//     } );

//     socket.on( 'remove_project', function ( data ) {
//         var proj_id = data._id;

//         if ( !running_processes.hasOwnProperty( proj_id ) ) {
//             return false;
//         }

//         if ( running_processes[ proj_id ].status == STATUS.running ) {
//             return false;
//         }

//         delete running_processes[ proj_id ];
//         get_running_projects( );

//     } );

//     socket.on( 'get_running_projects', function ( ) {
//         get_running_projects( );
//     } );

//     socket.on( 'proj_saved', function ( data ) {
//         // Project saved - Check cron
//         var _id = data._id;

//         Project.findOne( {
//             _id: _id
//         }, function ( err, doc ) {
//             if ( err ) {
//                 console.log( 'ERROR' + err );
//                 return;
//             }

//             if ( !doc.is_scheduled ) {
//                 // Unschedule if scheduled
//                 if ( scheduled_processes.hasOwnProperty( _id ) ) {
//                     scheduled_processes[ _id ].stop( );
//                     delete scheduled_processes[ _id ];
//                 }

//                 return false;
//             }

//             var cronJob = require( 'cron' ).CronJob;
//             scheduled_processes[ _id ] = new cronJob( doc.cron, function ( ) {
//                 var extra_data = {
//                     _id: _id,
//                     created_by: 'cron'
//                 };
//                 execute_project( extra_data );
//             }, null, true );

//         } );

//     } );

//     function get_running_projects( ) {
//         var running_processes_copy = {};

//         for ( prc_id in running_processes ) {
//             running_processes_copy[ prc_id ] = {};

//             for ( key in running_processes[ prc_id ] ) {
//                 if ( key != 'prog' ) {
//                     running_processes_copy[ prc_id ][ key ] = running_processes[ prc_id ][ key ]
//                 }
//             }
//         }

//         socket.emit( 'get_running_projects', running_processes_copy );
//         socket.broadcast.emit( 'get_running_projects', running_processes_copy );
//     }

//     function write_proj_to_log( _id ) {
//         var ProjectLog = require( './models/project_log' )

//         var project_log = new ProjectLog( running_processes[ _id ] );
//         project_log.save( function ( err ) {
//             if ( err ) {
//                 console.log( 'Cannot save project log' );
//             }
//         } );
//     }

// } );
////////////////////////////////////////////////////////
///////////////  HTTP SERVER   /////////////////////////
////////////////////////////////////////////////////////

server.listen( app.get( 'port' ), function ( ) {
    console.log( 'Express server listening on port ' + app.get( 'port' ) );
} );
