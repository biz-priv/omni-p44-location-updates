const { send_response } = require("../shared/helper");
const { locationUpdateSchema } = require("../shared/joiSchema");

module.exports.handler = async (event) => {
  console.log("Event", JSON.stringify(event));
  const body = event.body;

  try {
    await locationUpdateSchema.validateAsync(body);

    return {
      locationUpdateResponse: {
        message: "Success",
      },
    };
  } catch (error) {
    console.log("Error", error);

    // console.log(error.details);
    // const err = error.details;

    return send_response(400, error);
  }
};

function response(code, message) {
  return JSON.stringify({
    statusCode: code,
    message,
  });
}
