let mongoose = require('mongoose'),
	pricePeriodSchema = require('price-period'),
	AssetSchema = new mongoose.Schema({
		abbreviation: {
			type: String,
			required: true,
			unique: true
		},
		activityInfo: { // On Info page 
			type: String,
			required: true,
		},
		prices: [pricePeriodSchema],
		interestRate: {
			type: Number
		},
		market: { // On Info page, only stocks have it
			type: String
		},
		name: {
			type: String,
			required: true,
			unique: true
		},
		segment: { // On Info page, only stocks have it
			type: String
		},
		type: { // Stock, Bond, Currency, Oil and Gold
			type: String,
			required: true
		}


	});

module.exports = AssetSchema;