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
    $scope.running_projects = {};

    $scope.stdout = [];

    socket = io.connect('http://localhost:8888');

    socket.on('connect', function() {
        socket.on('stdout', function(data) {
            console.log(data);
            if ($scope.running_projects[data.id] == undefined) {
                $scope.running_projects[data.id] = {stdout: []};
            }

            if ($scope.running_projects[data.id].stdout == undefined) {
                $scope.running_projects[data.id].stdout = [];
            }

            $scope.running_projects[data.id].stdout.push(data.stdout);
            $scope.$apply();
        });

        socket.on('proj_start', function(data) {
            data.status = 'running';

            if ($scope.running_projects[data.id] != undefined) {
                data.stdout = $scope.running_projects[data.id].stdout;
            }

            $scope.running_projects[data.id] = data;
            $scope.$apply();
        });

        socket.on('proj_done', function(data) {
            $scope.running_projects[data.id].status = 'completed';
            $scope.$apply();
        });

        socket.on('get_running_projects', function(data) {
            console.log(data);
        });

        socket.emit('get_running_projects');
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

});
