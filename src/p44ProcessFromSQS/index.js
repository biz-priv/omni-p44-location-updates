const { marshall } = require("@aws-sdk/util-dynamodb");
const AWS = require("aws-sdk");
const sqs = new AWS.SQS();
const moment = require("moment-timezone");
const { put_dynamo } = require("../shared/dynamoDb");
const { log, logUtilization } = require("../shared/logger");
const { response } = require("../shared/helper");
const AWS = require("aws-sdk");
const {SNS_TOPIC_ARN } = process.env;
const sns = new AWS.SNS({ region: process.env.REGION });

const { P44_LOCATION_UPDATE_TABLE } = process.env;

exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  const records = event.Records;
  try {
    for (let i = 0; i < records.length; i++) {
      console.log("loopCount==>", i);

      try {
        let dynamoPayload = JSON.parse(event.Records[i].body);
        const correlationId = dynamoPayload.correlationId;
        await logUtilization(correlationId);

        dynamoPayload = {
          HouseBillNo: dynamoPayload.housebill,
          UTCTimeStamp: dynamoPayload.UTCTimestamp,
          CorrelationId: dynamoPayload.correlationId,
          InsertedTimeStamp: moment
            .tz("America/Chicago")
            .format("YYYY:MM:DD HH:mm:ss")
            .toString(),
          ShipmentStatus: "In-Complete",
          latitude: dynamoPayload.location.latitude,
          longitude: dynamoPayload.location.longitude,
        };
        dynamoPayload = marshall(dynamoPayload);
        // console.log("dynamoPayload", dynamoPayload);
        log(correlationId, JSON.stringify(dynamoPayload), 200);

        const dynamoParams = {
          TableName: P44_LOCATION_UPDATE_TABLE,
          Item: dynamoPayload,
        };

        console.log("dynamoParams", dynamoParams);
        log(correlationId, JSON.stringify(dynamoParams), 200);

        const res = await put_dynamo(dynamoParams);
        console.log("res", JSON.stringify(res));
        log(correlationId, JSON.stringify(res), 200);
      } catch (error) {
        throw error;
      }
    }
  } catch (error) {
    console.log("Error", error);
    const params = {
			Message: `Error in ${functionName}, Error: ${error.Message}`,
			TopicArn: SNS_TOPIC_ARN,
		};
    await sns.publish(params).promise();
    return callback(response("[400]", error));
  }
};
