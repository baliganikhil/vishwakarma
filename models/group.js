var mongoose = require('mongoose');

var Group = new mongoose.Schema({
    group: String,
    description: String
});

module.exports = mongoose.model('Group', Group);