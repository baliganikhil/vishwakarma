var io = require('socket.io').listen(8888);
var spawn = require('child_process').spawn;

var running_processes = {};

io.sockets.on('connection', function(socket) {

    socket.on('exec', function(data) {
        var cmd = data.cmd;
        var id = data.id;

        execute(cmd);

        function execute(command){
            var prog = spawn('bash', ['junk.sh']);

            running_processes[id] = prog;

            prog.stdout.setEncoding('utf8');
            prog.stdout.on('data', function (data) {
              socket.emit('stdout', data);
            });

            prog.stderr.setEncoding('utf8');
            prog.stderr.on('data', function (data) {
              socket.emit('stdout', data);
            });

            prog.on('close', function (code) {
              socket.emit('stdout', 'DONE');
            });
        };
    });

    socket.on('kill', function(data) {
        var id = data.id;

        running_processes[id].kill();

    });

});