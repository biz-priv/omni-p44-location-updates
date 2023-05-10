const AWS = require("aws-sdk");
const stepfunctions = new AWS.StepFunctions();

module.exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  await startP44LocationStepFn();
};

async function startP44LocationStepFn() {
  return new Promise(async (resolve, reject) => {
    try {
      const params = {
        stateMachineArn:
          "arn:aws:states:us-east-1:332281781429:stateMachine:omni-p44-process-location-updates-dev",
        input: JSON.stringify({}),
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
