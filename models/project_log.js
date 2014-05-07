var mongoose = require('mongoose');

var ProjectLog = new mongoose.Schema({
    project_id: Schema.Types.ObjectId,
    project_name: String,
    stdout: [String],
    created_by: String,
    created_at: { type: Date, default: Date.now },
    aborted_by: String,
    aborted_at: Date,
    completed_at: Date
});

module.exports = mongoose.model('ProjectLog', ProjectLog);