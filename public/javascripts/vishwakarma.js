var VishwakarmaModule = angular.module('VishwakarmaModule', [ ]);

var base_url = CONFIG.server;
if (CONFIG.port !== undefined) {
  base_url += ":" + CONFIG.port;
}

VishwakarmaModule.factory('VishwakarmaServices', function ($http) {

    return {

        get_projects: function (username) {
            return $http({
                method: 'GET',
                url: base_url + '/' + username + '/projects'
            });
        },

        get_project: function (_id) {
            return $http({
                method: 'GET',
                url: base_url + '/projects/' + _id
            });
        },

        save_project: function (params) {
            return $http({
                method: 'POST',
                data: JSON.stringify(params),
                url: base_url + '/projects/save'
            });

        },

        register: function (params) {
            return $http({
                method: 'POST',
                data: JSON.stringify(params),
                url: base_url + '/accounts/register'
            });

        },

        login: function (params) {
            return $http({
                method: 'POST',
                data: JSON.stringify(params),
                url: base_url + '/login'
            });

        },

        change_password: function (params) {
            return $http({
                method: 'POST',
                data: JSON.stringify(params),
                url: base_url + '/accounts/reset'
            });
        },

        get_logs: function () {
            return $http({
                method: 'GET',
                url: base_url + '/logs'
            });
        },

        get_log: function (log_id) {
            return $http({
                method: 'GET',
                url: base_url + '/logs/' + log_id
            });
        },

        get_users: function () {
            return $http({
                method: 'GET',
                url: base_url + '/users'
            });
        },

        get_groups: function () {
            return $http({
                method: 'GET',
                url: base_url + '/groups'
            });
        },

        get_users_for_group: function (group) {
            return $http({
                method: 'GET',
                url: base_url + '/groups/' + group + '/users'
            });
        },

        get_groups_for_project: function (project_id) {
            return $http({
                method: 'GET',
                url: base_url + '/projects/' + project_id + '/groups'
            });
        },

        save_group: function (params) {
            return $http({
                method: 'POST',
                data: JSON.stringify(params),
                url: base_url + '/groups/save'
            });

        },

        add_users_to_group: function (params) {
            return $http({
                method: 'POST',
                data: JSON.stringify(params),
                url: base_url + '/groups/users/add'
            });
        },

        add_groups_to_project: function (params) {
            return $http({
                method: 'POST',
                data: JSON.stringify(params),
                url: base_url + '/projects/project/groups/add'
            });
        },

        remove_project: function (params) {
            return $http({
                method: 'DELETE',
                url: base_url + '/projects/' + params._id + '/remove'
            });

        },

        is_authenticated: function () {
            return $http({
                method: 'GET',
                url: base_url + '/authenticated'
            });
        },

        logout: function () {
            return $http({
                method: 'GET',
                url: base_url + '/logout'
            });
        }
    }
});

VishwakarmaModule.controller('VKController', function ($scope, $timeout, VishwakarmaServices) {
    $scope.CONFIG = CONFIG;

    VishwakarmaServices.is_authenticated().success(function (data) {

        if (data.status == 'success') {
            $scope.SIGNIN.username = data.username;
            $scope.is_admin = data.is_admin;
            on_sign_in();
        }

    }).error(function (data) {
        alert('An error occurred while trying to authenticate');
    });


    $scope.SCREENS = {
        active_screen: 'login_register',
        login_mode: 'login',

    };

    $scope.SIGNIN = {
        username: '',
        password: '',
        confirm_password: '',
        signin_error: '',
        signup_error: ''
    };

    $scope.LOGS = {
        log_list: [ ],
        log_view: 'log_list'
    };

    $scope.PROJECTS = {
        saving: false
    };

    $scope.USERS = {
        user_view: '',
        saving_group: false,
        users: [ ],
        groups: [ ],
        selected_users_lhs: [ ],
        selected_groups_lhs: [ ],
        selected_users_rhs: [ ],
        selected_groups_rhs: [ ],
        users_rhs: [ ],
        groups_rhs: [ ],
        group_to_map: ''
    };

    $scope.GRPPRJ = {
        getting_groups: false,
        saving_groups: false
    };

    $scope.STATUS = {
        completed: 'completed',
        running: 'running',
        error: 'error',
        aborted: 'aborted'
    };

    $scope.proj_perm_map = {};

    $scope.cur_group = {};

    $scope.active_modal = '';
    $scope.running_projects = {};
    $scope.split_cron = {};
    $scope.stdout = [ ];

    function init_socket() {
        show_error('Trying to connect to server...');
        socket = io();

        socket.on('disconnect', function () {
            show_error('Lost connection with server...');
            $scope.$apply();
        });

        socket.on('connect', function () {
            $scope.show_error = false;

            socket.on('stdout', function (data) {
                if ($scope.running_projects[ data._id ] == undefined) {
                    $scope.running_projects[ data._id ] = data;
                    $scope.running_projects[ data._id ].stdout = [ data.stdout ];
                }

                $scope.running_projects[ data._id ].stdout.push(data.stdout);
                $scope.$apply();

                var output_console = document.getElementById('output_console');
                output_console.scrollTop = output_console.scrollHeight;
            });

            socket.on('proj_start', function (data) {
                $scope.running_projects[ data._id ] = data;
                $scope.running_projects[ data._id ].stdout = [ ];

                $scope.$apply();
            });

            socket.on('proj_done', function (data) {
                $scope.running_projects[ data._id ].status = data.status;
                $scope.running_projects[ data._id ].stdout.push(data.stdout);
                $scope.$apply();
            });

            socket.emit('get_running_projects');
            socket.on('get_running_projects', function (data) {
                $scope.running_projects = data;
                $scope.$apply();
            });
        });

        $scope.run_cmd = function (_id) {
            if ($scope.has_proj_run(_id)) {
                delete $scope.running_projects[ _id ];
            }

            var payload = {
                _id: _id,
                created_by: $scope.SIGNIN.username
            };
            socket.emit('exec', payload);
        };

        $scope.kill = function (_id) {
            socket.emit('kill', {
                _id: _id,
                aborted_by: $scope.SIGNIN.username
            });
        };

        $scope.remove_project = function (proj_id) {
            socket.emit('remove_project', {
                _id: proj_id
            });
        };

        $scope.save_project = function () {
            $scope.PROJECTS.saving = true;
            VishwakarmaServices.save_project($scope.cur_project).success(function (data) {
                $scope.PROJECTS.saving = false;

                if (data.status == 'error') {
                    alert('An error occurred while trying to save');
                    return;
                }

                $scope.get_projects();
                $scope.cur_project._id = data.data._id;

                socket.emit('proj_saved', {
                    _id: $scope.cur_project._id
                });

                $scope.PROJECTS.save_success = true;
                $timeout(function () {
                    $scope.PROJECTS.save_success = false;
                }, 5000);

            }).error(function (data) {
                alert('An error occurred while trying to save project');
                console.error(data);
            });
        };

    }

    $scope.show_stdout = function (active_proj) {
        if (!$scope.is_admin && !$scope.proj_perm_map[ active_proj.project_id ].logs) {
            return;
        }

        $scope.stdout_proj = active_proj;
        $scope.stdout_proj.stdout.forEach(function (line) {
            line = line.replace(/\n/g, '<br>');
        });

        $scope.SCREENS.active_screen = 'stdout';
    };

    $scope.init_new_project = function () {
        $scope.cur_project = {
            name: 'New Project',
            desc: '',
            code: '',
            log_retain: CONFIG.log_retain
        };

        $scope.SCREENS.active_screen = 'edit_project';
        // $scope.active_modal = 'modal_new_project';
    };

    $scope.cancel_new_project = function () {
        $scope.SCREENS.active_screen = 'view_projects';
        $scope.hide_modal();
    };

    $scope.hide_modal = function () {
        $scope.active_modal = '';
    };

    $scope.has_proj_run = function (proj_id) {
        return $scope.running_projects.hasOwnProperty(proj_id);
    };

    $scope.get_proj_status = function (proj_id) {
        if (!$scope.has_proj_run(proj_id)) {
            return null;
        }

        return $scope.running_projects[ proj_id ].status;
    };

    $scope.get_project = function (_id) {
        VishwakarmaServices.get_project(_id).success(function (data) {
            if (data.status == 'error') {
                alert('An error occurred while trying to get project');
                return;
            }

            $scope.cur_project = data.data;

            if (!nullOrEmpty($scope.cur_project.cron)) {
                var split_cron = $scope.cur_project.cron.split(' ');
                $scope.split_cron = {
                    minute: split_cron[1],
                    hour: split_cron[2],
                    day: split_cron[3],
                    month: split_cron[4],
                    DOW: split_cron[5],
                };
            } else {
                $scope.split_cron = {};
            }

            $scope.edit_proj_title = false;
            $scope.SCREENS.active_screen = 'edit_project';

        }).error(function (data) {
            alert('An error occurred while trying to fetch project');
            console.error(data);
        });
    };

    $scope.$watch('split_cron', function () {
        if (nullOrEmpty($scope.cur_project)) {
            return false;
        }

        var joined_cron = [0];

        joined_cron.push(nullOrEmpty($scope.split_cron.minute) ? '*' : $scope.split_cron.minute);
        joined_cron.push(nullOrEmpty($scope.split_cron.hour) ? '*' : $scope.split_cron.hour);
        joined_cron.push(nullOrEmpty($scope.split_cron.day) ? '*' : $scope.split_cron.day);
        joined_cron.push(nullOrEmpty($scope.split_cron.month) ? '*' : $scope.split_cron.month);
        joined_cron.push(nullOrEmpty($scope.split_cron.DOW) ? '*' : $scope.split_cron.DOW);

        $scope.cur_project.cron = joined_cron.join(' ');
    }, true);

    $scope.get_projects = function () {
        VishwakarmaServices.get_projects($scope.SIGNIN.username).success(function (data) {
            if (data.status == 'error') {
                alert('An error occurred while trying to get projects');
                return;
            }

            $scope.projects = data.data;

            $scope.projects_to_chain = [ {
                _id: '',
                name: ''
            } ].concat($scope.projects);

            $scope.proj_perm_map = {};
            data.data.forEach(function (project) {
                $scope.proj_perm_map[ project._id ] = project;
            });

        }).error(function (data) {
            alert('An error occurred while trying to fetch projects');
            console.error(data);
        });
    };

    $scope.register = function (is_bootstrap) {
        var params = {
            username: $scope.SIGNIN.username,
            password: $scope.SIGNIN.password
        };

        if (is_bootstrap) {
            params.is_bootstrap = true;
        } else {
            params.is_bootstrap = false;
        }

        $scope.SCREENS.signing_in = true;
        VishwakarmaServices.register(params).success(function (data) {
            $scope.SCREENS.signing_in = false;
            $scope.SIGNIN.password = undefined;
            $scope.SIGNIN.confirm_password = undefined;

            if (data.status == 'error') {
                $scope.SIGNIN.signup_error = data.msg;
                return;
            }

            $scope.SIGNIN.signup_error = undefined;
            $scope.SIGNIN.signin_error = undefined;
            $scope.SIGNIN.signup_success = true;

            $scope.SCREENS.login_mode = 'login';

        }).error(function (data) {
            $scope.SIGNIN.signup_error = data.data;
            $scope.SCREENS.signing_in = false;
        });
    };

    $scope.login = function () {
        var params = {
            username: $scope.SIGNIN.username,
            password: $scope.SIGNIN.password
        };

        $scope.SCREENS.signing_in = true;

        VishwakarmaServices.login(params).success(function (data) {
            $scope.SCREENS.signing_in = false;

            if (data.status == 'error') {
                $scope.SIGNIN.signin_error = 'Invalid username or password';
                return;
            }

            $scope.is_admin = data.is_admin;
            on_sign_in();

        }).error(function (data) {
            $scope.SIGNIN.signin_error = data.data;
            $scope.SCREENS.signing_in = false;
        });
    };

    function on_sign_in() {
        init_socket();

        $scope.SIGNIN.password = undefined;

        $scope.get_projects();
        $scope.SCREENS.active_screen = 'view_projects';
    }

    $scope.change_password = function () {
        var params = {
            password: $scope.SIGNIN.password,
            new_password: $scope.SIGNIN.new_password
        };

        $scope.SCREENS.signing_in = true;
        $scope.SIGNIN.reset_success = false;

        VishwakarmaServices.change_password(params).success(function (data) {
            $scope.SCREENS.signing_in = false;

            if (data.status == 'error') {
                $scope.SIGNIN.reset_error = 'Sorry, your password could not be changed';
                return;
            }

            $scope.SIGNIN.reset_success = true;

            $timeout(function () {
                window.location.reload();
            }, 2000);

        }).error(function (data) {
            alert('An error occurred while trying to change password');
            console.error(data);
        });
    };

    $scope.has_running_projects = function () {
        return Object.keys($scope.running_projects).length === 0;
    };

    $scope.validate_registration = function () {
        if ($scope.SIGNIN.confirm_password != $scope.SIGNIN.password) {
            return false;
        }

        if (nullOrEmpty($scope.SIGNIN.password) || nullOrEmpty($scope.SIGNIN.username)) {
            return false;
        }

        return true;
    };

    $scope.validate_change_password = function () {
        if ($scope.SIGNIN.new_password != $scope.SIGNIN.confirm_new_password) {
            return false;
        }

        if (nullOrEmpty($scope.SIGNIN.password) || nullOrEmpty($scope.SIGNIN.new_password)) {
            return false;
        }

        return true;
    };

    $scope.get_logs = function () {
        $scope.LOGS.getting_logs = true;
        VishwakarmaServices.get_logs($scope.cur_project).success(function (data) {
            $scope.LOGS.getting_logs = false;

            if (data.status == 'error') {
                alert('An error occurred while trying to get logs');
                return;
            }

            $scope.LOGS.log_list = data.data;
            $scope.LOGS.log_view = 'log_list';

        }).error(function (data) {
            alert('An error occurred while trying to get logs');
            console.error(data);
        });
    };

    $scope.get_log = function (log_id) {
        VishwakarmaServices.get_log(log_id).success(function (data) {
            if (data.status == 'error') {
                alert('An error occurred while trying to get log');
                return;
            }

            $scope.LOGS.cur_log = data.data;
            $scope.LOGS.log_view = 'log_view';

        }).error(function (data) {
            alert('An error occurred while trying to get logs');
            console.error(data);
        });
    };

    $scope.init_new_group = function () {
        $scope.cur_group = {};
        $scope.USERS.user_view = 'create_group';
    };

    $scope.save_group = function () {
        $scope.USERS.saving_group = true;
        VishwakarmaServices.save_group($scope.cur_group).success(function (data) {
            $scope.USERS.saving_group = false;

            if (data.status == 'error') {
                alert('An error occurred while trying to save');
                return;
            }

            $scope.USERS.saved_group = true;
            $timeout(function () {
                $scope.USERS.saved_group = false;
            }, 5000);

            $scope.get_groups();

        }).error(function (data) {
            alert('An error occurred while trying to save group');
            console.error(data);
        });
    };

    $scope.get_groups = function () {
        $scope.USERS.getting_groups = true;
        VishwakarmaServices.get_groups().success(function (data) {
            $scope.USERS.getting_groups = false;

            if (data.status == 'error') {
                alert('An error occurred while trying to save');
                return;
            }

            var groups = [];
            data.data.forEach(function(group) {
                if (group.group != 'admin') {
                    groups.push(group);
                }
            });

            $scope.USERS.groups = groups;

        }).error(function (data) {
            alert('An error occurred while trying to get groups');
            console.error(data);
        });
    };

    $scope.get_users_for_group = function (group) {
        $scope.USERS.group_to_map = group;
        $scope.USERS.user_view = 'add_users_to_group'

        $scope.USERS.getting_groups = true;
        VishwakarmaServices.get_users_for_group(group).success(function (data) {
            $scope.USERS.getting_groups = false;

            if (data.status == 'error') {
                alert('An error occurred while trying to save');
                return;
            }

            $scope.USERS.users_rhs = data.data.users;

        }).error(function (data) {
            alert('An error occurred while trying to get users for groups');
            console.error(data);
        });
    };

    $scope.get_groups_for_project = function (project_id) {
        $scope.GRPPRJ.getting_groups = true;
        VishwakarmaServices.get_groups_for_project(project_id).success(function (data) {
            $scope.GRPPRJ.getting_groups = false;

            if (data.status == 'error') {
                alert('An error occurred while trying to save');
                return;
            }

            $scope.GRPPRJ.grpprjmap = data.data;

        }).error(function (data) {
            alert('An error occurred while trying to get groups for project');
            console.error(data);
        });
    };

    $scope.add_users_to_group = function () {
        var params = {
            group: $scope.USERS.group_to_map,
            usernames: $scope.USERS.users_rhs
        };

        $scope.USERS.getting_groups = true;
        VishwakarmaServices.add_users_to_group(params).success(function (data) {
            $scope.USERS.getting_groups = false;

            if (data.status == 'error') {
                alert('An error occurred while trying to save');
                return;
            }

            $scope.USERS.save_success = true;
            $timeout(function () {
                $scope.USERS.save_success = false;
            }, 5000);

        }).error(function (data) {
            alert('An error occurred while trying to add users to group');
            console.error(data);
        });
    };

    $scope.get_users = function () {
        $scope.USERS.getting_users = true;
        VishwakarmaServices.get_users().success(function (data) {
            $scope.USERS.getting_users = false;

            if (data.status == 'error') {
                alert('An error occurred while trying to get users');
                return;
            }

            $scope.USERS.users = data.data;

        }).error(function (data) {
            alert('An error occurred while trying to get users');
            console.error(data);
        });
    };

    $scope.show_manage_users_pane = function () {
        $scope.get_users();
        $scope.get_groups();
        $scope.SCREENS.active_screen = 'manage_users';
    };

    $scope.show_manage_prjgrp_pane = function () {
        $scope.get_groups();
        $scope.SCREENS.active_screen = 'project_group_map';
        $scope.get_groups_for_project($scope.cur_project._id);
    };

    $scope.add_grpprj_row = function () {
        $scope.GRPPRJ.grpprjmap.push({});
    };

    $scope.remove_grpprj_row = function (key) {
        $scope.GRPPRJ.grpprjmap.splice(key, 1);
    };

    $scope.save_grpprj = function () {
        var group_names = [ ];
        var is_valid = true;
        $scope.GRPPRJ.grpprjmap.forEach(function (row) {
            if (group_names.indexOf(row.group) != -1) {
                alert('The group ' + row.group + ' is present on multiple lines');
                is_valid = false;
                return false;
            } else if (nullOrEmpty(row.group)) {
                alert('The group is missing');
                is_valid = false;
                return false;
            }

            group_names.push(row.group);
        });

        if (!is_valid) {
            return false;
        }

        var params = {
            project: $scope.cur_project._id,
            groups: $scope.GRPPRJ.grpprjmap
        };

        $scope.GRPPRJ.saving_groups = true;
        VishwakarmaServices.add_groups_to_project(params).success(function (data) {
            $scope.GRPPRJ.saving_groups = false;

            if (data.status == 'error') {
                alert('An error occurred while trying to save');
                return;
            }

            $scope.GRPPRJ.save_success = true;
            $timeout(function () {
                $scope.GRPPRJ.save_success = false;
            }, 5000);

        }).error(function (data) {
            alert('An error occurred while trying to add groups to project');
            console.error(data);
        });
    };

    $scope.toggle_select_user = function (username, direction) {
        var target = direction == 'lhs' ? $scope.USERS.selected_users_lhs : $scope.USERS.selected_users_rhs;

        if (!$scope.is_user_selected(username, direction)) {
            target.push(username);
        } else {
            target.splice(target.indexOf(username), 1);
        }
    };

    $scope.is_user_selected = function (username, direction) {
        var target = direction == 'lhs' ? $scope.USERS.selected_users_lhs : $scope.USERS.selected_users_rhs;
        return target.indexOf(username) > -1;
    };

    $scope.add_users_rhs = function () {
        $scope.USERS.users_rhs = $scope.USERS.users_rhs.concat($scope.USERS.selected_users_lhs);
        $scope.USERS.selected_users_lhs = [ ];
    };

    $scope.remove_users_rhs = function () {
        $scope.USERS.selected_users_rhs.forEach(function (username) {
            $scope.USERS.users_rhs.splice($scope.USERS.users_rhs.indexOf(username), 1);
        });

        $scope.USERS.selected_users_rhs = [ ];
    };

    $scope.delete_project = function (_id) {

        if (!confirm('Are you sure?')) {
            return false;
        }

        VishwakarmaServices.remove_project({
            _id: _id
        }).success(function (data) {

            if (data.status == 'error') {
                alert('An error occurred while trying to save');
                return;
            }

            $scope.cur_project = undefined;
            $scope.get_projects();
            $scope.SCREENS.active_screen = 'view_projects';

        }).error(function (data) {
            alert('An error occurred while trying to delete project');
            console.error(data);
        });
    };

    $scope.logout = function () {
        VishwakarmaServices.logout().success(function (data) {
            window.location.reload();
        }).error(function (data) {
            alert('An error occurred while trying to logout');
            console.error(data);
        });
    };

    $scope.indexOf = function (needle, haystack) {
        return haystack.indexOf(needle);
    };

    function nullOrEmpty(input) {
        return [ null, undefined, '' ].indexOf(input) > -1;
    }

    $scope.nullOrEmpty = function (input) {
        return nullOrEmpty(input);
    }

    function show_error(error_msg) {
        if (nullOrEmpty(error_msg)) {
            error_msg = 'Something bad happened...';
        }

        $scope.error_msg = error_msg;
        $scope.show_error = true;
    };

    $scope.handleKeyBoardEvent = function (event) {
        if (event.ctrlKey || event.metaKey) {
            // console.log(String.fromCharCode(event.which).toLowerCase())
            k = String.fromCharCode(event.which).toLowerCase()
            switch (k) {
            case 's':
                // console.log($scope.SCREENS.active_screen)
                if ($scope.SCREENS.active_screen == 'edit_project') {
                    $scope.save_project();
                    event.preventDefault();
                }
                break;
            case 'p':
                event.preventDefault();
                $scope.init_new_project();
                break;
            case 'h':
                event.preventDefault();
                $scope.SCREENS.active_screen = 'view_projects'
                break;
            case '¿':
                event.preventDefault();
                window.location = '/docs.html';
                break;
            }
        }
    }

});


VishwakarmaModule.filter('date_cleaner', function () {
    return function (input) {
        if (input == undefined) {
            return '';
        }

        // 2014-05-07T10:29:13.375Z
        var input_split = input.split('T');
        var date = input_split[ 0 ];
        var time = input_split[ 1 ];

        var date_split = date.split('-');
        time = time.split('.')[ 0 ];

        var months = {
            "01": "Jan",
            "02": "Feb",
            "03": "Mar",
            "04": "Apr",
            "05": "May",
            "06": "Jun",
            "07": "Jul",
            "08": "Aug",
            "09": "Sep",
            "10": "Oct",
            "11": "Nov",
            "12": "Dec"
        };

        return [ months[ date_split[ 1 ].toString() ], date_split[ 2 ], date_split[ 0 ], time ].join(' ');
    };
});

VishwakarmaModule.filter('no_self_ref', function() {
    return function(arr, ref) {

        if (arr == undefined || ref == undefined) {
            return;
        }

        arr.forEach(function(proj, key) {
            if (proj._id == ref._id) {
                arr.splice(key, 1);
            }
        });

        return arr;
    };
});