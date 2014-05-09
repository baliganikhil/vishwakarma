var Project = require('../models/projects.js');
var UserGroupMap = require('../models/user_group');
var GroupProjectMap = require('../models/group_project');

exports.get = function(req, res) {
    Project.find({}, {code: 0}, function(err, docs) {
        if (err) {
            res.send({status: 'error'});
        }

        res.send({status: 'success', data: docs});

    });

    // var username = req.params.username;
    // get_groups_for_user(username, res);
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
    GroupProjectMap.find({"group": {"$in": groups}}, {}, function(err, proj_permissions) {
        if (err) {
            console.log(JSON.stringify(err));
            return false;
        }

        var project_ids = [];
        proj_permissions.forEach(function(doc) {
            if (!doc.hide) {
                project_ids.push(doc.project);
            }
        });

        console.log(project_ids);

        // Project.find({_id: {'$in': project_ids}}, {code: 0}, function(err, docs) {
        //     if (err) {
        //         res.send({status: 'error'});
        //     }

        //     var final_response = [];
        //     proj_permissions.forEach(function(proj_permission_line) {
        //         docs.forEach(function(doc) {
        //             if (proj_permission_line.project == doc._id) {
        //                 doc.get = proj_permission_line.get;
        //                 doc.edit = proj_permission_line.edit;
        //                 doc.run = proj_permission_line.run;
        //                 doc.abort = proj_permission_line.abort;
        //                 doc.logs = proj_permission_line.logs;

        //                 final_response.push(doc);
        //                 return false;
        //             }
        //         });
        //     });

        //     res.send({status: 'success', data: final_response});

        // });
    });
}

exports.get_project = function(req, res) {
    var id = req.params.id;

    Project.findOne({_id: id}, function(err, docs) {
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

            res.send({status: 'success', data: doc});

        });
    } else {
        var _id = project._id;
        delete project._id;

        Project.update({_id: _id}, project, {upsert: true}, function(err, doc) {
            if (err) {
                console.log(err);
                res.send({status: 'error'});
            }

            res.send({status: 'success', data: doc});

        });
    }

};