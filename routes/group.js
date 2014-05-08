var Group = require('../models/group.js');

exports.get = function(req, res) {
    Group.find({}, {}, function(err, docs) {
        if (err) {
            res.send({status: 'error'});
        }

        res.send({status: 'success', data: docs});

    });
};

exports.save = function(req, res) {
    var group = req.body;

    if (group._id == undefined) {
        group = new Group(group);

        group.save(function(err, doc) {
            if (err) {
                res.send({status: 'error'});
            }

            res.send({status: 'success', data: doc});

        });
    } else {
        var _id = group._id;
        delete group._id;

        Group.update({_id: _id}, group, {upsert: true}, function(err, doc) {
            if (err) {
                res.send({status: 'error'});
            }

            res.send({status: 'success', data: doc});

        });
    }

};