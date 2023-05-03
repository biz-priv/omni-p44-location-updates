const { send_response, joiValidation } = require("../shared/helper");
const { locationUpdateSchema } = require("../shared/joiSchema");

module.exports.handler = async (event) => {
  console.log("Event", JSON.stringify(event));
  const body = event.body;

  try {
    try {
      await locationUpdateSchema.validateAsync(body);
    } catch (error) {
      let err = error.details[0].message;
      return { errorMessage: err };
    }

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
  return JSON.stringify({
    statusCode: code,
    message,
  });
}
