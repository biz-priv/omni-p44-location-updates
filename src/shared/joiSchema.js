/*
* File: src\shared\joiSchema.js
* Project: Omni-p44-location-updates
* Author: Bizcloud Experts
* Date: 2023-05-05
* Confidential and Proprietary
*/
const Joi = require("joi");

const locationSchema = Joi.object({
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
});

const objectSchema = Joi.object({
  housebill: Joi.string().required(),
  location: locationSchema.required(),
  UTCTimestamp: Joi.string().isoDate().required(),
  correlationId: Joi.string().required(),
});

const arraySchema = Joi.array().items(objectSchema);

const locationUpdateSchema = Joi.alternatives().try(arraySchema, objectSchema);

module.exports = { locationUpdateSchema };
