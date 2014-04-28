var io = require('socket.io').listen(8888);
var spawn = require('child_process').spawn;
var Project = require('./models/projects.js');
var fs = require('fs');

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/vishwakarma');

var running_processes = {};

io.sockets.on('connection', function(socket) {

    socket.on('exec', function(data) {
        var _id = data._id;

        Project.findOne({_id: _id}, function(err, doc) {
            if (err) {
                console.log('ERROR' + err);
                return;
            }


            var code = doc.code;
            var temp_file_name = Math.random().toString().slice(4) + '.sh';

            fs.writeFile(temp_file_name, code, function(err) {
                execute(temp_file_name, doc);
            });

        });

        function execute(filename, doc) {
            var prog = spawn('bash', [filename]);

            running_processes[filename] = prog;

            socket.emit('proj_start', {name: doc.name, id: filename});

            prog.stdout.setEncoding('utf8');
            prog.stdout.on('data', function (data) {
              socket.emit('stdout', {name: doc.name, id: filename, stdout: data});
              // socket.emit('stdout', data);
            });

            prog.stderr.setEncoding('utf8');
            prog.stderr.on('data', function (data) {
              socket.emit('stdout', {name: doc.name, id: filename, stdout: data});
            });

            prog.on('close', function (code) {
              socket.emit('stdout', 'DONE');
              socket.emit('proj_done', {name: doc.name, id: filename});
            });
        }
    });

    socket.on('kill', function(data) {
        var id = data.id;

        running_processes[id].kill();

    });

});
