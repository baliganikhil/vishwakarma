var Project = require('../models/projects.js');
var UserGroupMap = require('../models/user_group');
var GroupProjectMap = require('../models/group_project');
var Group = require('./group');

exports.get = function(req, res) {
    var username = req.params.username;
    get_groups_for_user(username, res);
};

function get_groups_for_user(username, res) {
    UserGroupMap.find({username: username}, {}, function(err, docs) {
        if (err) {
            console.log(JSON.stringify(err));
            return false;
        }

        var groups = [];
        docs.forEach(function(group) {
            groups.push(group.group);
        });

        get_projects_for_group(groups, res);

    });
}

function get_projects_for_group(groups, res) {
    GroupProjectMap.find({group: {'$in': groups}}, function(err, proj_permissions) {
        if (err) {
            console.log(JSON.stringify(err));
            return false;
        }

        var project_ids = [];
        proj_permissions.forEach(function(doc) {
            doc = JSON.parse(JSON.stringify(doc));
            if (!doc.hidden) {
                project_ids.push(doc.project);
            }
        });

        Project.find({_id: {'$in': project_ids}}, {code: 0, __v: 0}, function(err, docs) {
            if (err) {
                res.send({status: 'error'});
            }

            var final_response = [];
            proj_permissions.forEach(function(proj_permission_line) {
                proj_permission_line = JSON.parse(JSON.stringify(proj_permission_line));

                docs.forEach(function(doc) {
                    doc = JSON.parse(JSON.stringify(doc));

                    if (proj_permission_line.project == doc._id) {
                        doc.read = doc.read || proj_permission_line.read;
                        doc.edit = doc.edit || proj_permission_line.edit;
                        doc.run = doc.run || proj_permission_line.run;
                        doc.abort = doc.abort || proj_permission_line.abort;
                        doc.logs = doc.logs || proj_permission_line.logs;

                        final_response.push(doc);
                        return false;
                    }
                });
            });

            // Perform OR operation across permissions
            var map = {};
            final_response.forEach(function(line) {
                if (map[line._id] == undefined) {
                    map[line._id] = line;
                    return true;
                }

                map[line._id].read = line.read;
                map[line._id].edit = line.edit;
                map[line._id].run = line.run;
                map[line._id].abort = line.abort;
                map[line._id].logs = line.logs;
            });

            final_response = [];
            for (proj in map) {
                final_response.push(map[proj]);
            }

            res.send({status: 'success', data: final_response});

        });
    });
}

exports.get_project = function(req, res) {
    var id = req.params.id;

    Project.findOne({_id: id}, {__v: 0}, function(err, docs) {
        if (err) {
            res.send({status: 'error'});
        }

        res.send({status: 'success', data: docs});

    });
};

exports.save = function(req, res) {
    var project = req.body;

    if (project._id == undefined) {
        project = new Project(project);

        project.save(function(err, doc) {
            if (err) {
                console.log(err);
                res.send({status: 'error'});
            }

            // New project - add admin
            Group.v_add_groups_to_project(doc._id, [], function() {
                res.send({status: 'success', data: doc});
            });

        });
    } else {
        var _id = project._id;
        delete project._id;

        Project.findOneAndUpdate({_id: _id}, project, {upsert: true}, function(err, doc) {
            if (err) {
                console.log(err);
                res.send({status: 'error'});
            }

            res.send({status: 'success', data: doc});

        });
    }

};

exports.remove = function(req, res) {
    var _id = req.params._id;

    console.log(_id);

    Project.remove({_id: _id}, function(err) {
        if (err) {
            res.send({status: 'err'});
        }

        res.send({status: 'success'});
    });
};
