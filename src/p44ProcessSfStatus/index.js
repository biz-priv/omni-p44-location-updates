const AWS = require("aws-sdk");
const stepfunctions = new AWS.StepFunctions();
const { STEP_FUNCTION_ARN } = process.env;
const { log, logUtilization } = require("../shared/logger");

module.exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  // const correlationId = event.Records[0].NewImage.CorrelationId.S;
  // log(correlationId, JSON.stringify(event), 200);
  if (
    event.Records[0].eventName === "INSERT" &&
    event.Records[0].dynamodb.Keys.StepFunctionStatus.S ===
      "Yet to be Processed"
  ) {
    await startP44LocationStepFn(event);
  }
};

async function startP44LocationStepFn(event) {
  console.log("event", event);

  return new Promise(async (resolve, reject) => {
    try {
      const params = {
        stateMachineArn: STEP_FUNCTION_ARN,
        input: JSON.stringify(event),
      };

      const response = await stepfunctions.startExecution(params).promise();

      console.log("Response", response);
      console.log("P44 process updates location API started");
      resolve(true);
    } catch (error) {
      console.log("Error", error);
      console.log("P44 process updates location API failed ");
      resolve(false);
    }
  });
}
