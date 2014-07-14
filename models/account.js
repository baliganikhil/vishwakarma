var mongoose = require('mongoose');

var User = new mongoose.Schema(
		{
			username: { type: String, lowercase: true, trim: true, index: { unique: true } },
			name: String,
			sex: String,
			dob: Date,
			hash: String,
            cnfrm: Boolean
		}
	);

module.exports = mongoose.model('User', User);
