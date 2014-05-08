var Group = require('../models/group.js');
var UserGroupMap = require('../models/user_group');

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

exports.add_users_to_group = function(req, res) {
    var group = req.body.group;

    UserGroupMap.remove({group: group}, function(err) {
        if (err) {
            res.send({status: 'error'});
        }

        var records_to_process = req.body.usernames.length;

        if (records_to_process == 0) {
            res.send({status: 'success'});
        }

        req.body.usernames.forEach(function(username) {
            var usergroupmap = new UserGroupMap({group: group, username: username});

            usergroupmap.save(function(err, doc) {
                records_to_process--;

                if (records_to_process === 0) {
                    res.send({status: 'success'});
                }
            });
        });

    });
};