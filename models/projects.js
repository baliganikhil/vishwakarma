var mongoose = require('mongoose');

var Project = new mongoose.Schema({
    name: String,
    desc: String,
    code: String
});

module.exports = mongoose.model('Project', Project);