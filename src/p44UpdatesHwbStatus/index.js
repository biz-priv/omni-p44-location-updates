const { marshall } = require("@aws-sdk/util-dynamodb");
const { response } = require("../shared/helper");
const {
  update_dynamo_item,
  delete_dynamo_item,
} = require("../shared/dynamoDb");
const { P44_LOCATION_UPDATE_TABLE, P44_SF_STATUS_TABLE } = process.env;

module.exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  console.log("event==>", typeof event);
  const stepEvent = event;

  try {
    let newImage = stepEvent.Records[0].dynamodb.NewImage;
    const sfDltParams = {
      TableName: P44_SF_STATUS_TABLE,
      Key: {
        HouseBillNo: { S: newImage.HouseBillNo.S },
        StepFunctionStatus: { S: newImage.StepFunctionStatus.S },
      },
    };
    const sfParams = {
      TableName: P44_SF_STATUS_TABLE,
      Key: {
        HouseBillNo: { S: newImage.HouseBillNo.S },
        StepFunctionStatus: { S: newImage.StepFunctionStatus.S },
      },
      UpdateExpression: "SET #attr = :val",
      ExpressionAttributeNames: { "#attr": "StepFunctionStatus" },
      ExpressionAttributeValues: {
        ":val": { S: "Pending" },
      },
    };

    // const locationDltParams = {
    //   TableName: P44_LOCATION_UPDATE_TABLE,
    //   IndexName: "shipment-status-index-dev",
    //   Key: {
    //     ShipmentStatus: { S: newImage.StepFunctionStatus.S },
    //   },
    //   ConditionExpression: "ShipmentStatus = :value",
    //   ExpressionAttributeValues: {
    //     ":value": { S: "Yet to be Processed" },
    //   },
    // };
    const locationParams = {
      TableName: P44_LOCATION_UPDATE_TABLE,
      IndexName: "shipment-status-index-dev",
      Key: {
        ShipmentStatus: { S: newImage.StepFunctionStatus.S },
      },
      UpdateExpression: "SET #attr = :val",
      ExpressionAttributeNames: { "#attr": "ShipmentStatus" },
      ExpressionAttributeValues: {
        ":val": { S: "Pending" },
      },
    };

    console.log("sfParams", sfParams);
    console.log("locationParams", locationParams);

    const sfDlt = await delete_dynamo_item(sfDltParams);
    const sfResp = await update_dynamo_item(sfParams);
    console.log("Udated Successfully in P44_SF_STATUS_TABLE", sfResp);

    // const locationDlt = await delete_dynamo_item(locationParams);
    const locationResp = await update_dynamo(locationParams);
    console.log(
      "Udated Successfully in P44_LOCATION_UPDATE_TABLE",
      locationResp
    );
  } catch (error) {
    console.log("Error", error);
    return callback(response("[400]", "First Lambda Failed"));
  }
};
