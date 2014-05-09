var Group = require('../models/group.js');
var UserGroupMap = require('../models/user_group');
var GroupProjectMap = require('../models/group_project');

exports.get = function(req, res) {
    Group.find({}, {}, function(err, docs) {
        if (err) {
            res.send({status: 'error'});
        }

        res.send({status: 'success', data: docs});

    });
};

exports.get_users_for_group = function(req, res) {
    var group = req.params.group;
    UserGroupMap.find({group: group}, {}, function(err, docs) {
        if (err) {
            res.send({status: 'error'});
        }

        var data = {};
        data.group = group;
        data.users = [];

        docs.forEach(function(rec) {
            data.users.push(rec.username);
        });

        res.send({status: 'success', data: data});
    });
};

exports.save = function(req, res) {
    var group = req.body;
    function callback(err, doc) {
        if (err) {
            res.send({status: 'error'});
        }

        res.send({status: 'success', data: doc});
    }

    save(group, callback);
};

function save(group, callback) {
    if (group._id == undefined) {
        group = new Group(group);

        group.save(function(err, doc) {
            callback(err, doc);
        });
    } else {
        var _id = group._id;
        delete group._id;

        Group.update({_id: _id}, group, {upsert: true}, function(err, doc) {
            callback(doc);
        });
    }
}

exports.add_users_to_group = function(req, res) {
    var group = req.body.group;
    var usernames = req.body.usernames;

    function callback() {
        res.send({status: 'success'});
    }

    add_users_to_group(group, usernames, callback);
};

function add_users_to_group(group, usernames, callback) {
    UserGroupMap.remove({group: group}, function(err) {
        if (err) {
            res.send({status: 'error'});
        }

        var records_to_process = usernames.length;

        if (records_to_process == 0) {
            callback()
        }

        usernames.forEach(function(username) {
            var usergroupmap = new UserGroupMap({group: group, username: username});

            usergroupmap.save(function(err, doc) {
                records_to_process--;

                if (records_to_process === 0) {
                    callback()
                }
            });
        });

    });
}

exports.get_groups_for_project = function(req, res) {
    var project = req.params.project;
    console.log(project);
    GroupProjectMap.find({project: project}, {}, function(err, docs) {
        if (err) {
            res.send({status: 'error'});
        }

        res.send({status: 'success', data: docs});
    });
};

exports.add_groups_to_project = function(req, res) {
    var project = req.body.project;
    var groups = req.body.groups;

    function callback(payload) {
        res.send(payload);
    }

    add_groups_to_project(project, groups, callback);
};

function add_groups_to_project(project, groups, callback) {

    GroupProjectMap.remove({project: project}, function(err) {
        if (err) {
            callback({status: 'error'});
        }

        groups.push({group: 'admin', get: true, edit: true, run: true, abort: true, logs: true});
        var records_to_process = groups.length;

        groups.forEach(function(groupproject) {
            groupproject.project = project;
            var groupprojectmap = new GroupProjectMap(groupproject);

            groupprojectmap.save(function(err, doc) {
                records_to_process--;

                if (records_to_process === 0) {
                    callback({status: 'success'});
                }
            });
        });

    });

}

exports.create_admin_group = function(admin, callback) {
    var admin_group = {
        group: 'admin',
        description: 'Admin Group'
    };

    save(admin_group, function() {
        add_users_to_group('admin', [admin], callback);
    });
};