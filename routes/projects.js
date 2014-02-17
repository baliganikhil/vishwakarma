var Project = require('../models/projects.js');

exports.get = function(req, res) {
    Project.find(function(err, docs) {
        if (err) {
            res.send({status: 'error'});
        }

        res.send({status: 'success', data: docs});

    });
};

exports.save = function(req, res) {
    var project = new Project(req.body);

    project.save(function(err, doc) {
        if (err) {
            res.send({status: 'error'});
        }

        res.send({status: 'success', data: doc});

    });
};