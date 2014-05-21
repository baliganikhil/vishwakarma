io = require('socket.io').listen(8888);
spawn = require('child_process').spawn;
Project = require('./models/projects.js');
fs = require('fs');
var kill = require('tree-kill');

mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1/vishwakarma');

running_processes = {};
scheduled_processes = {};

var STATUS = {
    completed: 'completed',
    running: 'running',
    error: 'error',
    aborted: 'aborted'
};

function nullOrEmpty(input) {
    return [undefined, null, ''].indexOf(input) > -1;
}

io.sockets.on('connection', function(socket) {

    socket.on('exec', function(data) {
        execute_project(data);
    });

    function execute_project(data) {
        var _id = data._id;

        Project.findOne({_id: _id}, function(err, doc) {
            if (err) {
                console.log('ERROR' + err);
                return;
            }

            if (doc == null) {
                console.log(' === doc is null === ' + _id);
                return;
            }

            var code = doc.code;
            var temp_file_name = Math.random().toString().slice(4) + '.sh';

            fs.writeFile(temp_file_name, code, function(err) {
                execute(temp_file_name, doc, data);
            });

        });

        function execute(filename, doc, extra_data) {
            var prog = spawn('bash', [filename]);

            running_processes[doc._id] = {
                                            project_id: doc._id,
                                            prog: prog,
                                            name: doc.name,
                                            filename: filename,
                                            status: STATUS.running,
                                            stdout: [],
                                            created_at: new Date(),
                                            created_by: extra_data.created_by
                                        };

            socket.emit('proj_start', {name: doc.name, filename: filename, status: STATUS.running, _id: doc._id});
            socket.broadcast.emit('proj_start', {name: doc.name, filename: filename, status: STATUS.running, _id: doc._id});

            prog.stdout.setEncoding('utf8');
            prog.stdout.on('data', function (data) {

                running_processes[doc._id].stdout.push(data);

                var payload = {name: doc.name, filename: filename, stdout: data, status: STATUS.running, _id: doc._id};
                socket.emit('stdout', payload);
                socket.broadcast.emit('stdout', payload);

            });

            prog.stderr.setEncoding('utf8');
            prog.stderr.on('data', function (data) {
                var payload = {name: doc.name, filename: filename, stdout: data, _id: doc._id};
                socket.emit('stdout', payload);
                socket.broadcast.emit('stdout', payload);

                running_processes[doc._id].stdout.push(data);
            });

            prog.on('close', function (code) {
                var stdout = '';
                if (running_processes[doc._id].status != STATUS.aborted) {
                    running_processes[doc._id].status = STATUS.completed;
                    stdout = '=== COMPLETED ===';
                }

                var payload = {name: doc.name, filename: filename, status: running_processes[doc._id].status, _id: doc._id, stdout: stdout};
                socket.emit('proj_done', payload);
                socket.broadcast.emit('proj_done', payload);

                fs.unlink(filename, function (err) {
                    if (err) {
                        return false;
                    }
                });

                write_proj_to_log(doc._id);

                if (!nullOrEmpty(doc.next) && running_processes[doc._id].status == STATUS.completed) {
                    console.log("===== " + doc.next);
                    execute_project({_id: doc.next, created_by: running_processes[doc._id]});
                }
            });
        }
    }

    socket.on('kill', function(data) {
        var _id = data._id;

        kill(running_processes[_id].prog.pid, 'SIGKILL');
        running_processes[_id].stdout.push('=== ABORTED ===');
        running_processes[_id].status = STATUS.aborted;
        running_processes[_id].aborted_by = data.aborted_by;
        running_processes[_id].aborted_at = new Date();

        fs.unlink(running_processes[_id].filename, function (err) {
            if (err) {
                return false;
            }
        });

        var payload = {status: STATUS.aborted, _id: _id, stdout: '=== ABORTED by ' + data.aborted_by + ' at ' + running_processes[_id].aborted_at + ' ==='};
        socket.emit('proj_done', payload);
        socket.broadcast.emit('proj_done', payload);

    });

    socket.on('remove_project', function(data) {
        var proj_id = data._id;

        console.log(proj_id, Object.keys(running_processes));

        if (!running_processes.hasOwnProperty(proj_id)) {
            return false;
        }

        if (running_processes[proj_id].status == STATUS.running) {
            return false;
        }

        delete running_processes[proj_id];
        get_running_projects();

    });

    socket.on('get_running_projects', function() {
        get_running_projects();
    });

    socket.on('proj_saved', function(data) {
        // Project saved - Check cron
        var _id = data._id;

        Project.findOne({_id: _id}, function(err, doc) {
            if (err) {
                console.log('ERROR' + err);
                return;
            }

            if (!doc.is_scheduled) {
                // Unschedule if scheduled
                if (scheduled_processes.hasOwnProperty(_id)) {
                    scheduled_processes[_id].stop();
                    delete scheduled_processes[_id];
                }

                return false;
            }

            var cronJob = require('cron').CronJob;
            scheduled_processes[_id] = new cronJob(doc.cron, function() {
                var extra_data = {_id: _id, created_by: 'cron'};
                execute_project(extra_data);
            }, null, true);

        });

    });

    function get_running_projects() {
        var running_processes_copy = {};

        for (prc in running_processes) {
            running_processes_copy[prc] = running_processes[prc]
            delete running_processes_copy[prc].prog;
        }

        socket.emit('get_running_projects', running_processes_copy);
        socket.broadcast.emit('get_running_projects', running_processes_copy);
    }

    function write_proj_to_log(_id) {
        var ProjectLog = require('./models/project_log')

        var project_log = new ProjectLog(running_processes[_id]);
        project_log.save(function(err) {
            if (err) {
                console.log('Cannot save project log');
            }
        });
    }

});
