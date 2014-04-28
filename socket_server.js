var io = require('socket.io').listen(8888);
var spawn = require('child_process').spawn;
var Project = require('./models/projects.js');
var fs = require('fs');

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/vishwakarma');

var running_processes = {};

Object.deepExtend = function(destination, source) {
  for (var property in source) {
    if (typeof source[property] === "object" &&
     source[property] !== null ) {
      destination[property] = destination[property] || {};
      arguments.callee(destination[property], source[property]);
    } else {
      destination[property] = source[property];
    }
  }
  return destination;
};

// Object.extend(destination, source);

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

            running_processes[filename] = {prog: prog, name: doc.name, id: filename};

            socket.emit('proj_start', {name: doc.name, id: filename});

            prog.stdout.setEncoding('utf8');
            prog.stdout.on('data', function (data) {
                var payload = {name: doc.name, id: filename, stdout: data};
                socket.emit('stdout', payload);
                socket.broadcast.emit('stdout', payload);
            });

            prog.stderr.setEncoding('utf8');
            prog.stderr.on('data', function (data) {
                var payload = {name: doc.name, id: filename, stdout: data};
                socket.emit('stdout', payload);
                socket.broadcast.emit('stdout', payload);
            });

            prog.on('close', function (code) {
              var payload = {name: doc.name, id: filename};
              socket.emit('proj_done', payload);
              socket.broadcast.emit('proj_done', payload);
            });
        }
    });

    socket.on('kill', function(data) {
        var id = data.id;

        running_processes[id].prog.kill();
    });

    socket.on('get_running_projects', function() {
        Object.extend(running_processes_copy, running_processes);

        for (process in running_processes_copy) {
            delete running_processes_copy[process].prog;
        }

        socket.emit('get_running_projects', running_processes_copy);
    });

});
