var mongoose = require('mongoose');

var Project = new mongoose.Schema({
    name: String,
    desc: String,
    code: String,
    next: String,
    is_scheduled: Boolean,
    cron: String
});

module.exports = mongoose.model('Project', Project);