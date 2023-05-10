module.exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  await startNetsuitInvoiceStep()
};


async function startNetsuitInvoiceStep() {
  return new Promise((resolve, reject) => {
    try {
      const params = {
        stateMachineArn: "arn:aws:states:us-east-1:332281781429:stateMachine:omni-p44-process-location-updates-dev",
        input: JSON.stringify({}),
      };
      const stepfunctions = new AWS.StepFunctions();
      stepfunctions.startExecution(params, (err, data) => {
        if (err) {
          console.log("P44 process updates location API failed");
          resolve(false);
        } else {
          console.log("P44 process updates location API started");
          resolve(true);
        }
      });
    } catch (error) {
      resolve(false);
    }
  });
}