io = require('socket.io').listen(8888);
spawn = require('child_process').spawn;
Project = require('./models/projects.js');
fs = require('fs');

mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/vishwakarma');

running_processes = {};

var STATUS = {
    completed: 'completed',
    running: 'running',
    error: 'error'
};

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

            running_processes[doc.name] = {prog: prog, name: doc.name, id: filename, status: STATUS.running, stdout: []};

            socket.emit('proj_start', {name: doc.name, id: filename, status: STATUS.running});

            prog.stdout.setEncoding('utf8');
            prog.stdout.on('data', function (data) {
                running_processes[doc.name].stdout.push(data);

                var payload = {name: doc.name, id: filename, stdout: data, status: STATUS.running};
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
                running_processes[doc.name].status = STATUS.completed;

                var payload = {name: doc.name, id: filename, status: STATUS.completed};
                socket.emit('proj_done', payload);
                socket.broadcast.emit('proj_done', payload);
            });
        }
    });

    socket.on('kill', function(data) {
        var name = data.name;
        running_processes[name].id.prog.kill();
    });

    socket.on('remove_project', function(data) {
        var proj_name = data.name;

        if (!running_processes.hasOwnProperty(proj_name)) {
            return false;
        }

        if (running_processes[proj_name].status != STATUS.completed && running_processes[proj_name].status != STATUS.error) {
            return false;
        }

        delete running_processes[proj_name];
    });

    socket.on('get_running_projects', function() {
        var running_processes_copy = {};
        // Object.deepExtend(running_processes_copy, running_processes);

        for (prc in running_processes) {
            running_processes_copy[prc] = running_processes[prc]
            delete running_processes_copy[prc].prog;
        }

        socket.emit('get_running_projects', running_processes_copy);
    });

});
