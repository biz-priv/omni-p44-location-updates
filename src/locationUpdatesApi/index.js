const { locationUpdateSchema } = require("../shared/joiSchema");

module.exports.handler = async (event, context, callback) => {
  console.log("Event", JSON.stringify(event));
  const body = event.body;

  try {
    // const { error, value } = locationUpdateSchema.validate(body);
    await locationUpdateSchema.validateAsync(body);

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

function response(code, message) {
  return {
    statusCode: code,
    message,
  };
}
