var mongoose = require('mongoose');
const { Schema } = mongoose;

const fruitSchema = new Schema({
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
	},
	pageRank: {
		type: mongoose.Types.Decimal128
	}
});

const model = mongoose.model('Fruit', fruitSchema);

module.exports = model;