var mongoose = require('mongoose');

var ProjectLog = new mongoose.Schema({
    project_id: mongoose.Schema.Types.ObjectId,
    name: String,
    created_by: String,
    created_at: { type: Date, default: Date.now },
    aborted_by: String,
    aborted_at: Date,
    completed_at: Date,
    log_file: String,
    filename: String
});

module.exports = mongoose.model('ProjectLog', ProjectLog);