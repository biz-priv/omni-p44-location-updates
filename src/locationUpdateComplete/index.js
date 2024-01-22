const { marshall } = require("@aws-sdk/util-dynamodb");
const { response } = require("../shared/helper");
const { log, logUtilization } = require("../shared/logger");
const {
  delete_dynamo_item,
  put_dynamo,
  update_dynamo_item,
  query_dynamo,
} = require("../shared/dynamoDb");
const { P44_SF_STATUS_TABLE, P44_LOCATION_UPDATE_TABLE,P44_LOCATION_UPDATE_TABLE_INDEX } = process.env;
const AWS = require("aws-sdk");
const {SNS_TOPIC_ARN } = process.env;
const sns = new AWS.SNS({ region: process.env.REGION });

//=============>
const AWS = require("aws-sdk");
var ddb = new AWS.DynamoDB.DocumentClient();
let items;
let queryResults = [];
let correlationId = "";

module.exports.handler = async (event, context, callback) => {
  console.log("Event", JSON.stringify(event));

  const records = event.Records;
  const shipmentStatus = records[0].dynamodb.NewImage.ShipmentStatus.S;
  let locationResp;

  if (shipmentStatus === "Pending") {
    try {
      for (let i = 0; i < records.length; i++) {
        console.log("loopCount==>", i);
        try {
          const houseBill = records[i].dynamodb.NewImage.HouseBillNo.S;
          console.log("houseBill", houseBill);

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

          // Query Location_Update ------------------------------------------------------>
          const params = {
            TableName: P44_LOCATION_UPDATE_TABLE,
            IndexName: P44_LOCATION_UPDATE_TABLE_INDEX,
            KeyConditionExpression: "ShipmentStatus = :pk",
            FilterExpression: "HouseBillNo = :val",
            ExpressionAttributeValues: {
              ":pk": "Pending",
              ":val": houseBill,
            },
            limit: 100,
          };
          console.log("Location_Query_Params", params);

          do {
            items = await ddb.query(params).promise();
            items.Items.forEach((item) => queryResults.push(item));
            params.ExclusiveStartKey = items.LastEvaluatedKey;
          } while (typeof items.LastEvaluatedKey != "undefined");

          const locationData = queryResults;
          const filterdLocationData = locationData.filter(
            (data) => data.HouseBillNo === houseBill
          );
          // console.log("locationData", JSON.stringify(locationData));
          console.log(
            "filterdLocationData",
            JSON.stringify(filterdLocationData)
          );

          // Update Sf_Status------------------------------------------------------------>
          const sfDlt = await delete_dynamo_item(sfDltParams);
          const sfResp = await put_dynamo(sfParams);
          console.log("Udated Successfully in P44_SF_STATUS_TABLE");

          // Update Location_Updates------------------------------------------------------------>
          if (filterdLocationData.length > 0) {
            for (let j = 0; j < filterdLocationData.length; j++) {
              const utcTimeStamp = filterdLocationData[j].UTCTimeStamp;
              correlationId = filterdLocationData[j].CorrelationId;
              log(correlationId, JSON.stringify(utcTimeStamp), 200);

              console.log(`utcTimeStamp ${j}=====>`, utcTimeStamp);
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
        } catch (error) {
          console.log("Error", error);
        }
      }
      await logUtilization(correlationId);
      log(correlationId, JSON.stringify(event), 200);
      log(correlationId, JSON.stringify(locationResp), 200);
      return { Msg: "Statue Update Success" };
    } catch (error) {
      console.log("Error", error);
      const params = {
        Message: `Error in ${context.functionName}, Error: ${error.message}`,
        TopicArn: SNS_TOPIC_ARN,
      };
      await sns.publish(params).promise();
      return callback(response("[400]", "Status Update Failed"));
    }
  }
};
