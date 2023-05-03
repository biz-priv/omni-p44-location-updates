const Joi = require("joi");

const locationUpdateSchema = Joi.object({
  housebill: Joi.string().required(),
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
  }).required(),
  UTCTimestamp: Joi.string().isoDate().required(),
  correlationId: Joi.string().required(),
});

module.exports = { locationUpdateSchema };
