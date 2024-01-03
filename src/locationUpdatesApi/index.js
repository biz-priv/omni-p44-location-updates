const { send_message, response } = require("../shared/helper");
const { locationUpdateSchema } = require("../shared/joiSchema");
const { log, logUtilization } = require("../shared/logger");
const { P44_SQS_QUEUE_URL } = process.env;
const AWS = require("aws-sdk");
const {SNS_TOPIC_ARN } = process.env;
const sns = new AWS.SNS({ region: process.env.REGION });

module.exports.handler = async (event, context, callback) => {
  console.log("Event", JSON.stringify(event));
  console.log(process.env.DESTINATION);

  const body = event.body;
  const correlationId = isArray(body)
    ? body[0].correlationId
    : body.correlationId;

  log(correlationId, JSON.stringify(isArray(body)), 200);
  log(correlationId, JSON.stringify(event), 200);

  await logUtilization(correlationId);

  try {
    try {
      await locationUpdateSchema.validateAsync(body);
    } catch (error) {
      let err = error.details[0].message;
      err = err.replace(/\\/g, "").replace(/"/g, "");

      if (err.includes("iso")) {
        err = err.replace("iso", "YYYY-MM-DDTHH:mm:ssZ");
      }
      return callback(response("[400]", err));
    }
    const params = {
      MessageBody: JSON.stringify(body),
      QueueUrl: P44_SQS_QUEUE_URL,
    };
    let queueRes = await send_message(params);
    log(correlationId, JSON.stringify(queueRes), 200);

    return {
      locationUpdateResponse: {
        message: "Success",
        correlationId: correlationId,
      },
    };
  } catch (error) {
    const params = {
			Message: `Error in ${functionName}, Error: ${error.Message}`,
			TopicArn: SNS_TOPIC_ARN,
		};
    await sns.publish(params).promise();
    log(correlationId, JSON.stringify(error), 200);
    return callback(response("[400]", error));
  }
};
//

function isArray(a) {
  return !!a && a.constructor === Array;
}
