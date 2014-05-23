var mongoose = require('mongoose');

var User = new mongoose.Schema({
    username: { type: String, lowercase: true, trim: true, index: {unique: true} }
});

module.exports = mongoose.model('User', User);