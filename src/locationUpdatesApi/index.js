const { locationUpdateSchema } = require("../shared/joiSchema");
const { log, logUtilization } = require("../shared/logger");

module.exports.handler = async (event, context, callback) => {
  console.log("Event", JSON.stringify(event));

  const body = event.body;
  console.log(isArray(body));
  const correlationId = isArray(body)
    ? body[0].correlationId
    : body.correlationId;
  log(correlationId, JSON.stringify(event), 200);
  await logUtilization(correlationId);
  try {
    try {
      await locationUpdateSchema.validateAsync(body);
    } catch (error) {
      let err = error.details[0].message;
      err = err.replace(/\\/g, "").replace(/"/g, "");
      return callback(response("[400]", err));
    }
    return {
      locationUpdateResponse: {
        message: "Success",
        correlationId: correlationId,
      },
    };
  } catch (error) {
    log(correlationId, JSON.stringify(error), 200);
    return callback(response("[400]", error));
  }
};

function response(code, message) {
  return JSON.stringify({
    statusCode: code,
    message,
  });
}

function isArray(a) {
  return !!a && a.constructor === Array;
}
