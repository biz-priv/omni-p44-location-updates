const { send_response } = require("../shared/helper");
const { locationUpdateSchema } = require("../shared/joiSchema");

module.exports.handler = async (event, callback) => {
  console.log("Event", JSON.stringify(event));
  const body = event.body;
  const { error, value } = locationUpdateSchema.validate(body);

  try {
    console.log(value);

    if (error) {
      throw error;
    }
    // return send_response(200, value);
    return {
      locationUpdateResponse: {
        message: "Success",
      },
    };
  } catch (error) {
    return callback(response("[400]", error));
  }
};
