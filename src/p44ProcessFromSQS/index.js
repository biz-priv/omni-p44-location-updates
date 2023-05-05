const AWS = require("aws-sdk");
const sqs = new AWS.SQS();

exports.handler = async (event) => {
  console.log("event", JSON.stringify(event));
  const queueUrl =
    "https://sqs.us-east-1.amazonaws.com/332281781429/omni-p44-location-updates-queue-dev";
  const params = {
    QueueUrl: queueUrl,
    MaxNumberOfMessages: 10,
    VisibilityTimeout: 30,
    WaitTimeSeconds: 0,
  };

  try {
    const data = await sqs.receiveMessage(params).promise();
    if (data.Messages) {
      console.log(`Received ${data.Messages.length} messages:`);
      data.Messages.forEach((message) => {
        console.log(message.Body);
        // Do something with the message here
      });
    } else {
      console.log("No messages received");
    }
    // let dynamoPayload = JSON.parse(event.Records[0].body);
    // console.log("dynamoPayload", dynamoPayload);

    // dynamoPayload = marshall(dynamoPayload);

    // const dynamoParams = {
    //   TableName: TEST_DB_TABLE,
    //   Item: dynamoPayload,
    // };

    // console.log(dynamoParams);
    // const res = await put_dynamo(dynamoParams);
    // console.log("res", JSON.stringify(res));
  } catch (err) {
    console.log("Error", err);
  }

  return "Done";
};
