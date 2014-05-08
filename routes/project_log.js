var ProjectLog = require('../models/project_log.js');

exports.get = function(req, res) {
    ProjectLog.find({}, {stdout: 0}, function(err, docs) {
        if (err) {
            res.send({status: 'error'});
        }

        res.send({status: 'success', data: docs});

    });
};

exports.get_log = function(req, res) {
    var id = req.params.id;

    ProjectLog.findOne({_id: id}, function(err, docs) {
        if (err) {
            res.send({status: 'error'});
        }

        res.send({status: 'success', data: docs});

    });
};