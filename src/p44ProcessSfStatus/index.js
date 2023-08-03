const AWS = require("aws-sdk");
const stepfunctions = new AWS.StepFunctions();
const { STEP_FUNCTION_ARN } = process.env;
const { log, logUtilization } = require("../shared/logger");
// const { response } = require("../shared/helper");

module.exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  const records = event.Records;
  // const correlationId = event.Records[0].NewImage.CorrelationId.S;
  // log(correlationId, JSON.stringify(event), 200);
  for (let i = 0; i < records.length; i++) {
    console.log("LoopCount===>", i);
    if (
      records[i].eventName === "INSERT" &&
      records[i].dynamodb.Keys.StepFunctionStatus.S === "Yet to be Processed"
    ) {
      await startP44LocationStepFn(records[i]);
    } else {
      // return callback(response("[400]", "Not an Insert Event"));
      console.log(
        `StepFunctionStatus is ${records[i].dynamodb.Keys.StepFunctionStatus.S}`
      );
    }
  }
};

async function startP44LocationStepFn(event) {
  console.log("event", event);

  try {
    const params = {
      stateMachineArn: STEP_FUNCTION_ARN,
      input: JSON.stringify(event),
    };

    const response = await stepfunctions.startExecution(params).promise();

    console.log("Response", response);
    console.log("P44 Location Updates STEP-Function started");
    return true;
  } catch (error) {
    console.log("Error", error);
    console.log("P44 Location Updates STEP-Function failed");
    return false;
  }
}
