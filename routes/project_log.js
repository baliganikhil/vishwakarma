var ProjectLog = require('../models/project_log.js');
var fs = require('fs');

exports.get = function(req, res) {
    var query = ProjectLog.find({}, {stdout: 0}).sort({created_at: -1});

    query.exec(function(err, docs) {
        if (err) {
            res.send({status: 'error'});
        }

        res.send({status: 'success', data: docs});
    });
};

exports.get_log = function(req, res) {
    var id = req.params.id;

    ProjectLog.findOne({_id: id}, function(err, doc) {
        if (err) {
            res.send({status: 'error'});
        }

        var log_file = doc.log_file;

        doc = JSON.parse(JSON.stringify(doc));

        try {
            var log_file = JSON.parse(fs.readFileSync(log_file));
            doc.stdout = log_file.stdout;
        } catch(e) {
            doc.stdout = 'Log file could not be read - Deleted?';
        }

        res.send({status: 'success', data: doc});

    });
};