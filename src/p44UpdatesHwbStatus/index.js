const { response } = require("../shared/helper");
const {
  put_dynamo,
  delete_dynamo_item,
  update_dynamo_item,
  query_dynamo,
} = require("../shared/dynamoDb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const { P44_LOCATION_UPDATE_TABLE, P44_SF_STATUS_TABLE, SF_TABLE_INDEX_KEY } =
  process.env;

module.exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  console.log("event==>", typeof event);
  const stepEvent = event;

  try {
    let newImage = stepEvent.Records[0].dynamodb.NewImage;
    let keys = stepEvent.Records[0].dynamodb.Keys;
    const houseBill = keys.HouseBillNo.S;
    const sfStatus = keys.StepFunctionStatus.S;
    let locationStatus =
      keys.StepFunctionStatus.S === "Yet to be Processed"
        ? "In-Complete"
        : "Yet To be Processed";

    console.log(sfStatus, houseBill);

    let sfDynamoPayload = {
      HouseBillNo: houseBill,
      StepFunctionStatus: "Pending",
    };
    sfDynamoPayload = marshall(sfDynamoPayload);

    const sfDltParams = {
      TableName: P44_SF_STATUS_TABLE,
      Key: {
        HouseBillNo: { S: houseBill },
        StepFunctionStatus: { S: sfStatus },
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
        ":pk": locationStatus,
        ":val": houseBill,
      }),
    };

    const locationData = await query_dynamo(params);
    console.log("locationData", JSON.stringify(locationData));
    // console.log("utcTimeStamp", utcTimeStamp);
    //--------------------------------------------------------------------------------------------->

    console.log("sfParams", sfParams);
    console.log("locationParams", locationParams);

    const sfDlt = await delete_dynamo_item(sfDltParams);
    const sfResp = await put_dynamo(sfParams);
    console.log("Udated Successfully in P44_SF_STATUS_TABLE", sfResp);

    let locationResp;
    if (locationData.Items.length > 0) {
      for (let i = 0; i < locationData.Items.length; i++) {
        const utcTimeStamp = locationData.Items[i].UTCTimeStamp.S;
        const locationParams = {
          TableName: P44_LOCATION_UPDATE_TABLE,
          Key: {
            HouseBillNo: { S: houseBill },
            UTCTimeStamp: { S: utcTimeStamp },
          },
          UpdateExpression: "SET #attr = :val",
          ExpressionAttributeNames: { "#attr": "ShipmentStatus" },
          ExpressionAttributeValues: {
            ":val": { S: "Pending" },
          },
        };
        locationResp = await update_dynamo_item(locationParams);
      }
    }

    console.log(
      "Udated Successfully in P44_LOCATION_UPDATE_TABLE",
      locationResp
    );

    return { houseBill };
  } catch (error) {
    console.log("Error", error);
    return callback(response("[400]", "First Lambda Failed"));
  }
};
