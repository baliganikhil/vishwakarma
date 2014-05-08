var mongoose = require('mongoose');

var Group = new mongoose.Schema({
    group: {type: String, lowercase: true, trim: true, index: {unique: true}},
    description: String
});

module.exports = mongoose.model('Group', Group);