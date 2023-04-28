const { json } = require("stream/consumers");
const { send_response } = require("../../shared/helper");
const { locationUpdateSchema } = require("../../shared/JoiSchemas");

module.exports.handler = async (event) => {
  console.log("Event", JSON.stringify(event));
  const body = event.body;
  const { error, value } = locationUpdateSchema.validate(body);

  try {
    console.log(value);

    if (error) {
      throw error;
    }
    return send_response(200, value);
  } catch (error) {
    return send_response(400, error);
  }
};
