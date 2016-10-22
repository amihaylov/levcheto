let mongoose = require('mongoose'),
	pricePeriod = new mongoose.Schema({
		price: {
			type: Number,
			required: true
		},
		period: {
			type: String,
			required: true,
			unique: true
		}
	});

module.exports = pricePeriod;