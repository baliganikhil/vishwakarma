var mongoose = require('mongoose');

var ProjectGroupMap = new mongoose.Schema({
    group: String,
    project: mongoose.Schema.Types.ObjectId,
    hidden: {type: Boolean, default: false},
    read: {type: Boolean, default: false},
    edit: {type: Boolean, default: false},
    run: {type: Boolean, default: false},
    abort: {type: Boolean, default: false},
    logs: {type: Boolean, default: false}
});

module.exports = mongoose.model('ProjectGroupMap', ProjectGroupMap);