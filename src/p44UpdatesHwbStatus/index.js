const { marshall } = require("@aws-sdk/util-dynamodb");
const { response } = require("../shared/helper");
const { put_dynamo } = require("../shared/dynamoDb");
const { P44_LOCATION_UPDATE_TABLE, TABLE_NAME } = process.env;

module.exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  const stepEvent = JSON.parse(event);
  try {
    let dynamoPayload = JSON.parse(stepEvent.Records[0].body);
    dynamoPayload = {
      HouseBillNo: dynamoPayload.housebill,
      UTCTimeStamp: dynamoPayload.UTCTimestamp,
    };
    dynamoPayload = marshall(dynamoPayload);
    console.log("dynamoPayload", dynamoPayload);

    // const dynamoParams = {
    //   TableName: P44_LOCATION_UPDATE_TABLE,
    //   Item: dynamoPayload,
    // };

    // console.log(dynamoParams);
    // const res = await put_dynamo(dynamoParams);
  } catch (error) {
    console.log("Error", error);
    return callback(response("[400]", "First Lambda Failed"));
  }
};
