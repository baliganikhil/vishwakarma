var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');

var User = new mongoose.Schema({
    username: { type: String, lowercase: true, trim: true }
});

User.plugin(passportLocalMongoose);
module.exports = mongoose.model('User', User);