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

    $scope.stdout = [];

    // socket = io.connect('http://localhost:8888');

    // socket.on('connect', function() {
    //     socket.on('stdout', function(data) {
    //         console.log(data);
    //         $scope.stdout.push(data);
    //         $scope.$apply();
    //     });
    // });

    $scope.run_cmd = function(key) {
        socket.emit('exec', {cmd: $scope.projects[key].cmd, id: $scope.projects[key].id});
    };

    $scope.kill = function(key) {
        socket.emit('kill', {id: $scope.projects[key].id});
    };

    $scope.init_new_project = function() {
        $scope.cur_project = {
            name: 'New Project',
            desc: '',
            code: ''
        };

        $scope.active_screen = 'edit_project';
    };

    $scope.get_project = function(id) {
        VishwakarmaServices.get_project(id).success(function(data) {
            if (data.status == 'error') {
                alert('An error occurred while trying to get project');
                return;
            }

            $scope.cur_project = data.data;

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

});
