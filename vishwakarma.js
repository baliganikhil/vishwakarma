function VKController($scope) {
    $scope.projects = [
        {
            id: 1,
            name: 'My Project',
            cmd: 'for i in $(seq 1 100);do echo $i;sleep 1s;done'
        }
    ];

    $scope.stdout = [];

    socket = io.connect('http://localhost:8888');

    socket.on('connect', function() {
        socket.on('stdout', function(data) {
            console.log(data);
            $scope.stdout.push(data);
            $scope.$apply();
        });
    });

    $scope.run_cmd = function(key) {
        socket.emit('exec', {cmd: $scope.projects[key].cmd, id: $scope.projects[key].id});
    };

    $scope.kill = function(key) {
        socket.emit('kill', {id: $scope.projects[key].id});
    };

}

