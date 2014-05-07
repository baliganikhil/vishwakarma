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

        get_project: function(_id) {
            return $http({
                method: 'GET',
                url: base_url + '/projects/' + _id
            });
        },

        save_project: function(params) {
            return $http({
                method: 'POST',
                data: JSON.stringify(params),
                url: base_url + '/projects/save'
            });

        },

        register: function(params) {
            return $http({
                method: 'POST',
                data: JSON.stringify(params),
                url: base_url + '/accounts/register'
            });

        },

        login: function(params) {
            return $http({
                method: 'POST',
                data: JSON.stringify(params),
                url: base_url + '/login'
            });

        }
    }
});

VishwakarmaModule.controller('VKController', function ($scope, VishwakarmaServices) {
    $scope.active_screen = 'login_register';
    $scope.login_mode = 'login';
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
            if ($scope.running_projects[data._id] == undefined) {
                $scope.running_projects[data._id] = data;
                $scope.running_projects[data._id].stdout = [data.stdout];
            }

            if ($scope.running_projects[data._id].stdout == undefined) {
                $scope.running_projects[data._id].stdout = [];
            }

            $scope.running_projects[data._id].stdout.push(data.stdout);
            $scope.$apply();
        });

        socket.on('proj_start', function(data) {
            if ($scope.running_projects[data._id] == undefined) {
                $scope.running_projects[data._id] = data;
                $scope.running_projects[data._id].stdout = [data.stdout];
            }

            if ($scope.running_projects[data._id].stdout == undefined) {
                $scope.running_projects[data._id].stdout = [];
            }

            $scope.running_projects[data._id].stdout.push(data.stdout);
            $scope.$apply();
        });

        socket.on('proj_done', function(data) {
            $scope.running_projects[data._id].status = data.status;
            $scope.$apply();
        });

        socket.emit('get_running_projects');
        socket.on('get_running_projects', function(data) {
            $scope.running_projects = data;
            $scope.$apply();
        });
    });

    $scope.run_cmd = function(_id) {
        if ($scope.has_proj_run(_id)) {
            delete $scope.running_projects[_id];
        }

        var payload = {_id: _id, created_by: $scope.username, created_at: new Date()};
        socket.emit('exec', payload);
    };

    $scope.kill = function(_id) {
        socket.emit('kill', {_id: _id, aborted_by: $scope.username});
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

    $scope.has_proj_run = function(proj_id) {
        return $scope.running_projects.hasOwnProperty(proj_id);
    };

    $scope.get_proj_status = function(proj_id) {
        if (!$scope.has_proj_run(proj_id)) {
            return null;
        }

        return $scope.running_projects[proj_id].status;
    };

    $scope.remove_project = function(proj_id) {
        socket.emit('remove_project', {name: proj_id});
    };

    $scope.get_project = function(_id) {
        VishwakarmaServices.get_project(_id).success(function(data) {
            if (data.status == 'error') {
                alert('An error occurred while trying to get project');
                return;
            }

            $scope.cur_project = data.data;

            if (!nullOrEmpty($scope.cur_project.cron)) {
                var split_cron = $scope.cur_project.cron.split(' ');
                $scope.split_cron = {
                    minute: split_cron[0],
                    hour: split_cron[1],
                    day: split_cron[2],
                    month: split_cron[3],
                    DOW: split_cron[4],
                };
            } else {
                $scope.split_cron = {};
            }

            $scope.edit_proj_title = false;
            $scope.active_screen = 'edit_project';

        }).error(function(data) {

        });
    };

    $scope.$watch('split_cron', function() {
        var joined_cron = [];

        joined_cron.push(nullOrEmpty($scope.split_cron.minute) ? '*' : $scope.split_cron.minute);
        joined_cron.push(nullOrEmpty($scope.split_cron.hour) ? '*' : $scope.split_cron.hour);
        joined_cron.push(nullOrEmpty($scope.split_cron.day) ? '*' : $scope.split_cron.day);
        joined_cron.push(nullOrEmpty($scope.split_cron.month) ? '*' : $scope.split_cron.month);
        joined_cron.push(nullOrEmpty($scope.split_cron.DOW) ? '*' : $scope.split_cron.DOW);

        $scope.cur_project.cron = joined_cron.join(' ');
    }, true);

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

    $scope.register = function() {
        var params = {
            username: $scope.username,
            password: $scope.password
        };
        VishwakarmaServices.register(params).success(function(data) {
            if (data.status == 'error') {
                alert('An error occurred while trying to register you');
                return;
            }

            alert('Registered successfully');
            console.log(data);

        }).error(function(data) {

        });
    };

    $scope.login = function() {
        var params = {
            username: $scope.username,
            password: $scope.password
        };

        VishwakarmaServices.login(params).success(function(data) {
            if (data.status == 'error') {
                alert('Could not log you in');
                return;
            }

            $scope.get_projects();
            $scope.active_screen = 'view_projects';

        }).error(function(data) {

        });
    };

    $scope.has_running_projects = function() {
        return Object.keys($scope.running_projects).length === 0;
    };

    $scope.validate_registration = function() {
        if ($scope.confirm_password != $scope.password) {
            return false;
        }

        if (nullOrEmpty($scope.password) || nullOrEmpty($scope.username)) {
            return false;
        }

        return true;
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
