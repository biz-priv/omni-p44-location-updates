/*
* File: src\p44UpdatesHwbStatus\index.js
* Project: Omni-p44-location-updates
* Author: Bizcloud Experts
* Date: 2024-02-27
* Confidential and Proprietary
*/
const { marshall } = require("@aws-sdk/util-dynamodb");
const { response } = require("../shared/helper");
const { log, logUtilization } = require("../shared/logger");
const {
  put_dynamo,
  delete_dynamo_item,
  update_dynamo_item
} = require("../shared/dynamoDb");
const moment = require("moment-timezone");

const { P44_LOCATION_UPDATE_TABLE, P44_SF_STATUS_TABLE, P44_LOCATION_UPDATE_TABLE_INDEX } = process.env;

//=============>
const AWS = require("aws-sdk");
var ddb = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  console.log("event==>", typeof event);
  const stepEvent = event;

  try {
    let keys = stepEvent.dynamodb.Keys;
    const houseBill = keys.HouseBillNo.S;
    const sfStatus = keys.StepFunctionStatus.S;
    let locationStatus = "";
    let correlationId = "";

    if (keys.StepFunctionStatus.S === "Yet to be Processed") {
      locationStatus = "In-Complete";
    }

    // For SF_Status--------------------------------------------------------------------->
    let sfDynamoPayload = {
      HouseBillNo: houseBill,
      StepFunctionStatus: "Pending",
    };
    
    sfDynamoPayload = marshall(sfDynamoPayload);

    const sfParams = {
      TableName: P44_SF_STATUS_TABLE,
      Item: sfDynamoPayload,
    };

    const sfDltParams = {
      TableName: P44_SF_STATUS_TABLE,
      Key: {
        HouseBillNo: { S: houseBill },
        StepFunctionStatus: { S: sfStatus },
      },
    };
    // Query Location updates --------------------------------------------------------------------------------------------->
    const params = {
      TableName: P44_LOCATION_UPDATE_TABLE,
      IndexName: P44_LOCATION_UPDATE_TABLE_INDEX,
      KeyConditionExpression: "ShipmentStatus = :pk",
      FilterExpression: "HouseBillNo = :val",
      ExpressionAttributeValues: {
        ":pk": locationStatus,
        ":val": houseBill,
      }
    };
    console.log("Location_Query_Params", params);

    // do {
    //   items = await ddb.query(params).promise();
    //   items.Items.forEach((item) => queryResults.push(item));
    //   params.ExclusiveStartKey = items.LastEvaluatedKey;
    // } while (typeof items.LastEvaluatedKey != "undefined");

    let locationData = await dbReadWithLastEvaluatedKey(params);
    locationData = locationData.Items
    console.log("locationData", JSON.stringify(locationData));
    //--------------------------------------------------------------------------------------------->

    // console.log("sfParams", sfParams);
    // console.log("locationParams", locationParams);

    // Update SF_Status---------------------------------------------------------------------------->
    const sfDlt = await delete_dynamo_item(sfDltParams);
    console.info('🙂 -> file: index.js:82 -> module.exports.handler= -> sfDlt:', sfDlt);
    const sfResp = await put_dynamo(sfParams);
    console.log("Udated Successfully in P44_SF_STATUS_TABLE", sfResp);

    // Update Location_Updates----------------------------------------------------------------------->
    let locationResp;
    if (locationData.length > 0) {
      for (let i = 0; i < locationData.length; i++) {
        const utcTimeStamp = locationData[i].UTCTimeStamp;
        correlationId = locationData[i].CorrelationId;
        log(correlationId, JSON.stringify(utcTimeStamp), 200);

        console.log(`utcTimeStamp ${i}=====>`, utcTimeStamp);
        const locationParams = {
          TableName: P44_LOCATION_UPDATE_TABLE,
          Key: {
            HouseBillNo: { S: houseBill },
            UTCTimeStamp: { S: utcTimeStamp },
          },
          UpdateExpression: "SET #attr = :val,  UpdatedAt = :updatedAt",
          ExpressionAttributeNames: { "#attr": "ShipmentStatus" },
          ExpressionAttributeValues: {
            ":val": { S: "Pending" },
            ":updatedAt": {
              S: moment
                .tz("America/Chicago")
                .format("YYYY:MM:DD HH:mm:ss")
                .toString()
            }
          },
        };
        console.info('🙂 -> file: index.js:107 -> module.exports.handler= -> locationParams:', locationParams);
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

    return { houseBill };
  } catch (error) {
    console.log("Error", error);
    return callback(response("[400]", "First Lambda Failed"));
  }
};

async function dbReadWithLastEvaluatedKey(params) {
  async function helper(params) {
    let result = await ddb.query(params).promise();
    let data = result.Items;
    if (result.LastEvaluatedKey) {
      params.ExclusiveStartKey = result.LastEvaluatedKey;
      data = data.concat(await helper(params));
    }
    return data;
  }
  let readData = await helper(params);
  return { Items: readData };
}