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

const { log, logUtilization } = require("../shared/logger");

//=============>
const AWS = require("aws-sdk");
var ddb = new AWS.DynamoDB.DocumentClient();
let items;
let queryResults = [];

module.exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  console.log("event==>", typeof event);
  const stepEvent = event;

  try {
    let newImage = stepEvent.Records[0].dynamodb.NewImage;
    let correlationId = "";
    let keys = stepEvent.Records[0].dynamodb.Keys;
    const houseBill = keys.HouseBillNo.S;
    const sfStatus = keys.StepFunctionStatus.S;
    let locationStatus = "";

    if (keys.StepFunctionStatus.S === "Yet to be Processed") {
      locationStatus = "In-Complete";
    }

    // console.log(sfStatus, houseBill);

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
      ExpressionAttributeValues: {
        ":pk": locationStatus,
        ":val": houseBill,
      },
      limit: 100,
    };
    console.log(params);
    // const locationData = await query_dynamo(params);

    do {
      items = await ddb.query(params).promise();
      items.Items.forEach((item) => queryResults.push(item));
      params.ExclusiveStartKey = items.LastEvaluatedKey;
    } while (typeof items.LastEvaluatedKey != "undefined");

    const locationData = queryResults;

    console.log("locationData", JSON.stringify(locationData));
    // console.log("utcTimeStamp", utcTimeStamp);
    //--------------------------------------------------------------------------------------------->

    // console.log("sfParams", sfParams);
    // console.log("locationParams", locationParams);

    const sfDlt = await delete_dynamo_item(sfDltParams);
    const sfResp = await put_dynamo(sfParams);
    // console.log("Udated Successfully in P44_SF_STATUS_TABLE", sfResp);

    let locationResp;
    if (locationData.length > 0) {
      for (let i = 0; i < locationData.length; i++) {
        const utcTimeStamp = locationData[i].UTCTimeStamp;
        correlationId = locationData[i].CorrelationId;
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
    log(correlationId, JSON.stringify(event), 200);
    log(correlationId, JSON.stringify(locationResp), 200);
    await logUtilization(correlationId);

    return { houseBill };
  } catch (error) {
    console.log("Error", error);
    return callback(response("[400]", "First Lambda Failed"));
  }
};
