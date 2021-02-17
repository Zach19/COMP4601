var mongoose = require('mongoose');
const { Schema } = mongoose;

const pageSchema = new Schema({
	title: {
		type: String
	},
	paragraph: {
		type: String
	},
	outgoingLinks: {
		type: Array
	},
	incomingLinks: {
		type: Array
	},
	numberOfIncoming: {
		type: Number
	}
});

const model = mongoose.model('Page', pageSchema);

module.exports = model;