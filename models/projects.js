var mongoose = require('mongoose');

var Project = new mongoose.Schema({
    name: String,
    desc: String,
    code: String,
    next: String,
    status: {type: String, default: 'active'},
    is_scheduled: Boolean,
    cron: String,
    log_retain: {type: Number, default: -1},
    created_by: String,
    updated_by: String,
    created_at: {type: Date, default: Date.now},
    updated_at: {type: Date, default: Date.now}
});

module.exports = mongoose.model('Project', Project);