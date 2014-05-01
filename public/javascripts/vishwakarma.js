var VishwakarmaModule = angular.module('VishwakarmaModule', []);

var base_url = 'http://localhost:3000';

VishwakarmaModule.factory('VishwakarmaServices', function($http) {

    return {

        get_projects: function() {
            return $http({
                method: 'GET',
                url: base_url + '/projects'
            });
        },

        get_project: function(id) {
            return $http({
                method: 'GET',
                url: base_url + '/projects/' + id
            });
        },

        save_project: function(params) {
            return $http({
                method: 'POST',
                data: JSON.stringify(params),
                url: base_url + '/projects/save'
            });

        }
    }
});

VishwakarmaModule.controller('VKController', function ($scope, VishwakarmaServices) {
    $scope.active_screen = 'view_projects';
    $scope.active_modal = '';
    show_error('Unable to connect to server...');
    $scope.running_projects = {};

    $scope.stdout = [];

    $scope.STATUS = {
        completed: 'completed',
        running: 'running',
        error: 'error'
    };

    socket = io.connect('http://localhost:8888');
    console.log(socket)

    socket.on('disconnect', function() {
        show_error('Lost connection with server...');
        $scope.$apply();
    });

    socket.on('connect', function() {
        $scope.show_error = false;

        socket.on('stdout', function(data) {
            if ($scope.running_projects[data.name] == undefined) {
                $scope.running_projects[data.name] = data;
                $scope.running_projects[data.name].stdout = [data.stdout];
            }

            if ($scope.running_projects[data.name].stdout == undefined) {
                $scope.running_projects[data.name].stdout = [];
            }

            $scope.running_projects[data.name].stdout.push(data.stdout);
            $scope.$apply();
        });

        socket.on('proj_start', function(data) {
            if ($scope.running_projects[data.name] == undefined) {
                $scope.running_projects[data.name] = data;
                $scope.running_projects[data.name].stdout = [data.stdout];
            }

            if ($scope.running_projects[data.name].stdout == undefined) {
                $scope.running_projects[data.name].stdout = [];
            }

            $scope.running_projects[data.name].stdout.push(data.stdout);
            $scope.$apply();
        });

        socket.on('proj_done', function(data) {
            $scope.running_projects[data.name].status = data.status;
            $scope.$apply();
        });

        socket.emit('get_running_projects');
        socket.on('get_running_projects', function(data) {
            $scope.running_projects = data;
            $scope.$apply();
        });
    });

    $scope.run_cmd = function(_id) {
        socket.emit('exec', {_id: _id});
    };

    $scope.kill = function(_id) {
        socket.emit('kill', {_id: _id});
    };

    $scope.show_stdout = function(active_proj) {
        $scope.stdout_proj = active_proj;
        $scope.active_screen = 'stdout';
    };

    $scope.init_new_project = function() {
        $scope.cur_project = {
            name: 'New Project',
            desc: '',
            code: ''
        };

        $scope.active_screen = 'edit_project';
        // $scope.active_modal = 'modal_new_project';
    };

    $scope.cancel_new_project = function() {
        $scope.active_screen = 'view_projects';
        $scope.hide_modal();
    };

    $scope.hide_modal = function() {
        $scope.active_modal = '';
    };

    $scope.has_proj_run = function(proj_name) {
        return $scope.running_projects.hasOwnProperty(proj_name);
    };

    $scope.get_proj_status = function(proj_name) {
        if (!$scope.has_proj_run(proj_name)) {
            return null;
        }

        return $scope.running_projects[proj_name].status;
    };

    $scope.remove_project = function(proj_name) {
        socket.emit('remove_project', {name: proj_name});
    };

    $scope.get_project = function(id) {
        VishwakarmaServices.get_project(id).success(function(data) {
            if (data.status == 'error') {
                alert('An error occurred while trying to get project');
                return;
            }

            $scope.cur_project = data.data;

            $scope.edit_proj_title = false;
            $scope.active_screen = 'edit_project';

        }).error(function(data) {

        });
    };

    $scope.get_projects = function() {
        VishwakarmaServices.get_projects($scope.cur_project).success(function(data) {
            if (data.status == 'error') {
                alert('An error occurred while trying to get projects');
                return;
            }

            $scope.projects = data.data;

        }).error(function(data) {

        });
    };

    $scope.get_projects();

    $scope.save_project = function() {
        VishwakarmaServices.save_project($scope.cur_project).success(function(data) {
            if (data.status == 'error') {
                alert('An error occurred while trying to save');
                return;
            }

            alert('Saved successfully');

        }).error(function(data) {

        });
    };

    $scope.has_running_projects = function() {
        return Object.keys($scope.running_projects).length === 0;
    };

    function nullOrEmpty(input) {
        return [null, undefined, ''].indexOf(input) > -1;
    }

    function show_error(error_msg) {
        if (nullOrEmpty(error_msg)) {
            error_msg = 'Something bad happened...';
        }

        $scope.error_msg = error_msg;
        $scope.show_error = true;
    };

});
