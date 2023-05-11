const { response } = require("../shared/helper");
const {
  put_dynamo,
  delete_dynamo_item,
  update_dynamo_item,
  query_dynamo,
} = require("../shared/dynamoDb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const { P44_LOCATION_UPDATE_TABLE, P44_SF_STATUS_TABLE } = process.env;

module.exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  console.log("event==>", typeof event);
  const stepEvent = event;

  try {
    let newImage = stepEvent.Records[0].dynamodb.NewImage;
    let keys = stepEvent.Records[0].dynamodb.Keys;
    const houseBill = keys.HouseBillNo.S;
    const status = keys.StepFunctionStatus.S;
    console.log(status, houseBill);

    let sfDynamoPayload = {
      HouseBillNo: houseBill,
      StepFunctionStatus: "Pending",
    };
    sfDynamoPayload = marshall(sfDynamoPayload);

    const sfDltParams = {
      TableName: P44_SF_STATUS_TABLE,
      Key: {
        HouseBillNo: { S: houseBill },
        StepFunctionStatus: { S: status },
      },
    };
    const sfParams = {
      TableName: P44_SF_STATUS_TABLE,
      Item: sfDynamoPayload,
    };
    //--------------------------------------------------------------------------------------------->
    const params = {
      TableName: P44_LOCATION_UPDATE_TABLE,
      IndexName: "shipment-status-index-dev",
      KeyConditionExpression: "ShipmentStatus = :pk",
      FilterExpression: "HouseBillNo = :val",
      ExpressionAttributeValues: marshall({
        ":pk": status,
        ":val": houseBill,
      }),
    };

    const locationData = await query_dynamo(params);
    console.log("locationData", locationData);
    // const utcTimeStamp = locationData;
    //--------------------------------------------------------------------------------------------->

    // const locationParams = {
    //   TableName: P44_LOCATION_UPDATE_TABLE,
    //   Key: {
    //     HouseBillNo: { S: houseBill },
    //     UTCTimeStamp: { S: utcTimeStamp },
    //   },
    //   UpdateExpression: "SET #attr = :val",
    //   ExpressionAttributeNames: { "#attr": "ShipmentStatus" },
    //   ExpressionAttributeValues: {
    //     ":val": { S: "Pending" },
    //   },
    // };

    console.log("sfParams", sfParams);
    // console.log("locationParams", locationParams);

    const sfDlt = await delete_dynamo_item(sfDltParams);
    const sfResp = await put_dynamo(sfParams);
    console.log("Udated Successfully in P44_SF_STATUS_TABLE", sfResp);

    // const locationResp = await update_dynamo_item(locationParams);
    // console.log(
    //   "Udated Successfully in P44_LOCATION_UPDATE_TABLE",
    //   locationResp
    // );
  } catch (error) {
    console.log("Error", error);
    return callback(response("[400]", "First Lambda Failed"));
  }
};
