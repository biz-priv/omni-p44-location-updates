const Joi = require("joi");

// const locationUpdateSchema = Joi.object({
//   reference: Joi.string().required(),
//   location: Joi.object({
//     latitude: Joi.number().required(),
//     longitude: Joi.number().required(),
//   }).required(),
//   UTCTimestamp: Joi.string().required(),
// });
const locationUpdateSchema = Joi.object().keys({
  reference: Joi.string().required(),
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
  }).required(),
  UTCTimestamp: Joi.string().required(),
});

module.exports = { locationUpdateSchema };
