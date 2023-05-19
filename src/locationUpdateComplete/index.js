const { marshall } = require("@aws-sdk/util-dynamodb");
const { response } = require("../shared/helper");
const { log, logUtilization } = require("../shared/logger");
const {
  delete_dynamo_item,
  put_dynamo,
  update_dynamo_item,
} = require("../shared/dynamoDb");
const { P44_SF_STATUS_TABLE, P44_LOCATION_UPDATE_TABLE } = process.env;

//=============>
const AWS = require("aws-sdk");
var ddb = new AWS.DynamoDB.DocumentClient();
let items;
let queryResults = [];

module.exports.handler = async (event, context, callback) => {
  console.log("Event", JSON.stringify(event));

  const records = event.Records;
  const houseBill = records[0].dynamodb.NewImage.HouseBillNo.S;
  const shipmentStatus = records[0].dynamodb.NewImage.ShipmentStatus.S;

  if (shipmentStatus === "Pending") {
    try {
      // For Sf_Status------------------------------------------------------------->
      let sfDynamoPayload = {
        HouseBillNo: houseBill,
        StepFunctionStatus: "Complete",
      };
      sfDynamoPayload = marshall(sfDynamoPayload);

      const sfDltParams = {
        TableName: P44_SF_STATUS_TABLE,
        Key: {
          HouseBillNo: { S: houseBill },
          StepFunctionStatus: { S: "Pending" },
        },
      };
      const sfParams = {
        TableName: P44_SF_STATUS_TABLE,
        Item: sfDynamoPayload,
      };

      console.log("sfDltParams", sfDltParams);
      console.log("sfParams", sfParams);

      // Update Sf_Status------------------------------------------------------------>
      const sfDlt = await delete_dynamo_item(sfDltParams);
      const sfResp = await put_dynamo(sfParams);
      console.log("Udated Successfully in P44_SF_STATUS_TABLE");

      // Query Location_Update ------------------------------------------------------>
      const params = {
        TableName: P44_LOCATION_UPDATE_TABLE,
        IndexName: "shipment-status-index-dev",
        KeyConditionExpression: "ShipmentStatus = :pk",
        FilterExpression: "HouseBillNo = :val",
        ExpressionAttributeValues: {
          ":pk": "Pending",
          ":val": houseBill,
        },
        limit: 100,
      };

      do {
        items = await ddb.query(params).promise();
        items.Items.forEach((item) => queryResults.push(item));
        params.ExclusiveStartKey = items.LastEvaluatedKey;
      } while (typeof items.LastEvaluatedKey != "undefined");

      console.log("locationData", JSON.stringify(queryResults));

      // Update Location_Updates------------------------------------------------------------>
      let locationResp;
      if (queryResults.length > 0) {
        for (let i = 0; i < queryResults.length; i++) {
          const utcTimeStamp = queryResults[i].UTCTimeStamp;
          correlationId = queryResults[i].CorrelationId;
          log(correlationId, JSON.stringify(correlationId), 200);

          console.log(`utcTimeStamp${i}=====>`, utcTimeStamp);
          const locationParams = {
            TableName: P44_LOCATION_UPDATE_TABLE,
            Key: {
              HouseBillNo: { S: houseBill },
              UTCTimeStamp: { S: utcTimeStamp },
            },
            UpdateExpression: "SET #attr = :val",
            ExpressionAttributeNames: { "#attr": "ShipmentStatus" },
            ExpressionAttributeValues: {
              ":val": { S: "Complete" },
            },
          };
          locationResp = await update_dynamo_item(locationParams);
        }
      }
      console.log(
        "Udated Successfully in P44_LOCATION_UPDATE_TABLE",
        locationResp
      );
      log(correlationId, JSON.stringify(event), 200);
      log(correlationId, JSON.stringify(locationResp), 200);
      await logUtilization(correlationId);
      return { Msg: "Statue Update Success" };
    } catch (error) {
      console.log("Error", error);
      return callback(response("[400]", "Statue Update Failed"));
    }
  }
};
