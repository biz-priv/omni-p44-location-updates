const AWS = require("aws-sdk");
const sqs = new AWS.SQS();

exports.handler = async (event) => {
  const params = {
    DelaySeconds: 2,
    MessageAttributes: {
      Author: {
        DataType: "String",
        StringValue: "The location update json",
      },
    },
    MessageBody: "TEST of the SQS service.",
    QueueUrl:
      "https://sqs.us-east-1.amazonaws.com/332281781429/omni-p44-location-updates-queue-dev",
  };

  let queueRes = await sqs.sendMessage(params).promise();
  const response = {
    statusCode: 200,
    body: queueRes,
  };

  return response;
};
