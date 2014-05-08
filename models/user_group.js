var mongoose = require('mongoose');

var UserGroupMap = new mongoose.Schema({
    group: String,
    username: String
});

module.exports = mongoose.model('UserGroupMap', UserGroupMap);