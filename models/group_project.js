var mongoose = require('mongoose');

var ProjectGroupMap = new mongoose.Schema({
    group: String,
    project: String,
    see: {type: Boolean, default: false},
    get: {type: Boolean, default: false},
    edit: {type: Boolean, default: false},
    run: {type: Boolean, default: false},
    abort: {type: Boolean, default: false},
    logs: {type: Boolean, default: false}
});

module.exports = mongoose.model('ProjectGroupMap', ProjectGroupMap);