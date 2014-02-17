var Project = require('../models/projects.js');

exports.get = function(req, res) {
    Project.find({}, {code: 0}, function(err, docs) {
        if (err) {
            res.send({status: 'error'});
        }

        res.send({status: 'success', data: docs});

    });
};

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