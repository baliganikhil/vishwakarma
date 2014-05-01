io = require('socket.io').listen(8888);
spawn = require('child_process').spawn;
Project = require('./models/projects.js');
fs = require('fs');

mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/vishwakarma');

running_processes = {};

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

            running_processes[doc.name] = {prog: prog, name: doc.name, id: filename, status: 'running'};

            socket.emit('proj_start', {name: doc.name, id: filename, status: 'running'});

            prog.stdout.setEncoding('utf8');
            prog.stdout.on('data', function (data) {
                var payload = {name: doc.name, id: filename, stdout: data, status: 'running'};
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
              var payload = {name: doc.name, id: filename, status: 'completed'};
              socket.emit('proj_done', payload);
              socket.broadcast.emit('proj_done', payload);
            });
        }
    });

    socket.on('kill', function(data) {
        var id = data.id;

        // running_processes[id].prog.kill();
    });

    socket.on('get_running_projects', function() {
        var running_processes_copy = {};

        for (prc in running_processes) {
            running_processes_copy[prc] = {};
            running_processes_copy[prc] = running_processes[prc]
            delete running_processes_copy[prc].prog;
        }

        // console.log('***********************************8');
        // console.log(JSON.stringify(running_processes))
        // console.log('***********************************8');
        // console.log(JSON.stringify(running_processes_copy))
        // console.log('***********************************8');

        socket.emit('get_running_projects', running_processes_copy);
        // socket.emit('get_running_projects', JSON.stringify(running_processes_copy));
    });

});
