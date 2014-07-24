module.exports = function (server, config) {
    var io = require('socket.io')(server);
    var spawn = require('child_process').spawn;
    var Project = require('./models/projects.js');
    var fs = require('fs');
    var kill = require('tree-kill');
    var cronJob = require('cron').CronJob;

    var running_processes = {};
    var scheduled_processes = {};

    var STATUS = {
        completed: 'completed',
        running: 'running',
        error: 'error',
        aborted: 'aborted'
    };

    function nullOrEmpty(input) {
        return [undefined, null, ''].indexOf(input) > -1;
    }

    function run_scheduled_projects() {
        Project.find({status: 'active', is_scheduled: true}, function(err, docs) {
            if (err) {
                console.error(err);
                return;
            } else if (docs.length === 0) {
                return;
            }

            docs.forEach(function(doc) {
                _id = doc._id;

                scheduled_processes[_id] = new cronJob(doc.cron, function () {
                    var extra_data = {
                        _id: _id,
                        created_by: 'cron'
                    };
                    execute_project(doc, extra_data);
                }, null, true);
            });

            console.log('Scheduled', docs.length, 'jobs');

        });
    }

    run_scheduled_projects();

    function execute_project(project, extra_data) {
        var code = project.code;
        var temp_file_name = Math.random().toString().slice(4) + '.sh';

        fs.writeFile(temp_file_name, code, function (err) {
            execute(temp_file_name, project, extra_data);
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

            io.emit('proj_start', {
                name: doc.name,
                filename: filename,
                status: STATUS.running,
                _id: doc._id
            });

            prog.stdout.setEncoding('utf8');
            prog.stdout.on('data', function (data) {

                running_processes[doc._id].stdout.push(data);

                var payload = {
                    name: doc.name,
                    filename: filename,
                    stdout: data,
                    status: STATUS.running,
                    _id: doc._id
                };

                io.emit('stdout', payload);
            });

            prog.stderr.setEncoding('utf8');
            prog.stderr.on('data', function (data) {
                var payload = {
                    name: doc.name,
                    filename: filename,
                    stdout: data,
                    _id: doc._id
                };

                io.emit('stdout', payload);

                running_processes[doc._id].stdout.push(data);
            });

            prog.on('close', function (code) {
                var stdout = '';

                if (code !== 0) {
                    running_processes[doc._id].status = STATUS.error;
                    stdout = '=== ERROR ===';
                } else if (running_processes[doc._id].status != STATUS.aborted) {
                    running_processes[doc._id].status = STATUS.completed;
                    stdout = '=== COMPLETED ===';
                }

                var payload = {
                    name: doc.name,
                    filename: filename,
                    status: running_processes[doc._id].status,
                    _id: doc._id,
                    stdout: stdout
                };

                io.emit('proj_done', payload);

                fs.unlink(filename, function (err) {
                    if (err) {
                        return false;
                    }
                });

                write_proj_to_log(doc._id);
                delete_old_logs(doc);

                if (!nullOrEmpty(doc.next) && running_processes[doc._id].status == STATUS.completed) {

                    Project.findOne({_id: doc.next}, function(err, chained_project) {
                        execute_project(chained_project, {
                            created_by: running_processes[doc._id]
                        });
                    });

                }
            });
        }
    }

    io.sockets.on('connection', function (socket) {

        socket.on('exec', function (data) {
            var _id = data._id;

            Project.findOne({
                _id: _id,
                status: 'active'
            }, function (err, doc) {
                if (err) {
                    console.error('ERROR', err);
                    return;
                }

                if (doc == null) {
                    return;
                }

                execute_project(doc, {});
            });
        });

        socket.on('kill', function (data) {
            var _id = data._id;

            kill(running_processes[_id].prog.pid, 'SIGQUIT');
            running_processes[_id].stdout.push('=== ABORTED ===');
            running_processes[_id].status = STATUS.aborted;
            running_processes[_id].aborted_by = data.aborted_by;
            running_processes[_id].aborted_at = new Date();

            fs.unlink(running_processes[_id].filename, function (err) {
                if (err) {
                    return false;
                }
            });

            var payload = {
                status: STATUS.aborted,
                _id: _id,
                stdout: ['=== ABORTED by ', data.aborted_by, ' at ', running_processes[_id].aborted_at, ' ==='].join('')
            };

            io.emit('proj_done', payload);

        });

        socket.on('remove_project', function (data) {
            var proj_id = data._id;

            if (!running_processes.hasOwnProperty(proj_id)) {
                return false;
            }

            if (running_processes[proj_id].status == STATUS.running) {
                return false;
            }

            delete running_processes[proj_id];
            get_running_projects();

        });

        socket.on('get_running_projects', function () {
            get_running_projects();
        });

        socket.on('proj_saved', function (data) {
            // Project saved - Check cron
            var _id = data._id;

            Project.findOne({
                _id: _id
            }, function (err, doc) {
                if (err) {
                    console.error('ERROR', err);
                    return;
                }

                function stop_schedule(sid) {
                    if (scheduled_processes.hasOwnProperty(sid)) {
                        scheduled_processes[sid].stop();
                        delete scheduled_processes[sid];
                    }
                }

                if (!doc.is_scheduled || doc.status != 'active') {
                    // Unschedule if scheduled
                    stop_schedule(_id);
                    return false;
                } else {
                    // Stop scheduled job because we are rescheduling
                    stop_schedule(_id);
                }

                scheduled_processes[_id] = new cronJob(doc.cron, function () {
                    var extra_data = {
                        created_by: 'cron'
                    };

                    Project.findOne({_id: _id}, function(err, doc) {
                        if (err) {
                            console.error(err);
                            return;
                        } else if (nullOrEmpty(doc)) {
                            return;
                        }

                        execute_project(doc, extra_data);

                    });

                }, null, true);

            });

        });

        function get_running_projects() {
            var running_processes_copy = {};

            for (prc_id in running_processes) {
                running_processes_copy[prc_id] = {};

                for (key in running_processes[prc_id]) {
                    if (key != 'prog') {
                        running_processes_copy[prc_id][key] = running_processes[prc_id][key]
                    }
                }
            }

            io.emit('get_running_projects', running_processes_copy);
        }

    });

    function write_proj_to_log(_id) {

        if (!config.logs_save) {
            return false;
        }

        var path = require('path');
        var date = new Date();

        var dir = path.join(config.logs_path, [date.getDate(), date.getMonth(), date.getFullYear()].join('_'));

        try{
            fs.mkdirSync(dir);
        } catch(e) {
            console.log('Folder', dir, 'already exists');
        }

        var log_file_name = path.join(dir, [running_processes[_id].name, date.getTime()].join('_'));
        fs.writeFile(log_file_name, JSON.stringify(running_processes[_id]), function(err) {
            if (err) {
                console.error('Cannot save project log', err);
            }
        });

        running_processes[_id].log_file = log_file_name;

        delete running_processes[_id].stdout;

        var ProjectLog = require('./models/project_log');

        var project_log = new ProjectLog(running_processes[_id]);
        project_log.save(function (err) {
            if (err) {
                console.error('Cannot save project log', err);
            }
        });
    }

    function delete_old_logs(project) {
        if (nullOrEmpty(project.log_retain) || project.log_retain === -1) {
            return;
        }

        var log_retain = project.log_retain;

        var ProjectLog = require('./models/project_log');
        var query = ProjectLog.find({project_id: project._id}, {created_at: 1}).sort({created_at: -1}).skip(log_retain).limit(1);

        query.exec(function(err, docs) {
            if (err) {
                console.error(err);
                return;
            } else if (docs.length === 0) {
                return;
            }

            var doc = docs[0];
            var remove_condition = {created_at: {'$gt': doc.created_at}};

            ProjectLog.find(remove_condition, {log_file: 1}, function(err, docs) {
                if (err) {
                    console.error(err);
                    return;
                }

                docs.forEach(function(doc) {
                    var filename = doc.log_file;

                    fs.exists(filename, function(exists) {
                        fs.unlink(filename, function (err) {
                            if (err) {
                                console.error(err);
                                return;
                            }
                        });
                    });
                });

            });

            ProjectLog.remove(remove_condition, function(err) {
                if (err) {
                    console.error(err);
                    return;
                }
            });


        });
    }

}
