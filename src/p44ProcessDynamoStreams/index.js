/*
* File: src\p44ProcessDynamoStreams\index.js
* Project: Omni-p44-location-updates
* Author: Bizcloud Experts
* Date: 2024-02-27
* Confidential and Proprietary
*/
const { marshall } = require("@aws-sdk/util-dynamodb");
const { query_dynamo, put_dynamo, update_dynamo_item } = require("../shared/dynamoDb");
const { log, logUtilization } = require("../shared/logger");
const { response } = require("../shared/helper");
const moment = require("moment-timezone");
const { CUSTOMER_MCKESSON, SHIPMENT_HEADER_TABLE, P44_SF_STATUS_TABLE, SHIPMENT_HEADER_TABLE_INDEX, P44_LOCATION_UPDATE_TABLE, SHIPMENT_LOCATION_UPDATES_SNS } =
  process.env;
const AWS = require('aws-sdk');
const sns = new AWS.SNS();

module.exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  const customerIds = CUSTOMER_MCKESSON.split(",");
  const record = event.Records;

  try {
    await Promise.all(record.map(async (record, i) => {
      console.log("loopCount==>", i);
      const houseBill = record.dynamodb.NewImage.HouseBillNo?.S;
      const utcTimestamp = record.dynamodb.NewImage.UTCTimeStamp?.S;
      const correlationId = record.dynamodb.NewImage.CorrelationId?.S;
      if (!houseBill || !correlationId || !utcTimestamp) {
        console.info("houseBill or correlationId is not present");
        return;
      }
      await logUtilization(correlationId);
      log(correlationId, JSON.stringify(houseBill), 200);

      console.log("houseBill", houseBill);

      if (record.eventName === "INSERT") {
        try {
          const params = {
            TableName: SHIPMENT_HEADER_TABLE,
            IndexName: SHIPMENT_HEADER_TABLE_INDEX,
            KeyConditionExpression: "Housebill = :pk",
            ExpressionAttributeValues: marshall({
              ":pk": houseBill,
            }),
          };

          const shipmetData = await query_dynamo(params);
          console.log("shipmetData", JSON.stringify(shipmetData));
          log(correlationId, JSON.stringify(shipmetData), 200);

          if (shipmetData.Items.length > 0) {
            const billNumber = shipmetData.Items[0].BillNo.S;
            log(correlationId, JSON.stringify(billNumber), 200);

            console.log("billNumber", billNumber);
            console.log("customerIds", customerIds);
            const fkServicelevelId = shipmetData?.Items[0]?.FK_ServiceLevelId?.S
            if (customerIds.includes(billNumber) && ["HS", "FT"].includes(fkServicelevelId)) {
              console.log("billNumber", billNumber);
              let dynamoPayload = {
                HouseBillNo: houseBill,
                StepFunctionStatus: "Yet to be Processed",
              };
              dynamoPayload = marshall(dynamoPayload);

              const dynamoParams = {
                TableName: P44_SF_STATUS_TABLE,
                Item: dynamoPayload,
              };

              console.log("dynamoParams", JSON.stringify(dynamoParams));
              await put_dynamo(dynamoParams);
              
            } else {

              const params = {
                Message: JSON.stringify({
                  default: "No data",
                  sqs: JSON.stringify(record),
                }),
                MessageStructure: "json",
                TopicArn: SHIPMENT_LOCATION_UPDATES_SNS,
                MessageAttributes: {
                  BillNo: {
                    DataType: "String",
                    StringValue: billNumber,
                  },
                },
              };
              console.info("params: ", params);
              await sns.publish(params).promise();

              const locationParams = {
                TableName: P44_LOCATION_UPDATE_TABLE,
                Key: {
                  HouseBillNo: { S: houseBill },
                  UTCTimeStamp: { S: utcTimestamp },
                },
                UpdateExpression: "SET #attr = :val, UpdatedAt = :updatedAt, Message = :message",
                ExpressionAttributeNames: { "#attr": "ShipmentStatus" },
                ExpressionAttributeValues: {
                  ":val": { S: "SUCCESS" },
                  ":message": { S: `SENT TO SNS` },
                  ":updatedAt": {
                    S: moment
                      .tz("America/Chicago")
                      .format("YYYY:MM:DD HH:mm:ss")
                      .toString()
                  }
                },
              };
              console.info('🙂 -> file: index.js:125 -> module.exports.handler= -> locationParams:', locationParams);
              const locationResp = await update_dynamo_item(locationParams);
              console.info('🙂 -> file: index.js:126 -> module.exports.handler= -> locationResp:', locationResp);
            }
          } else {
            console.log("Ignored response");
            const locationParams = {
              TableName: P44_LOCATION_UPDATE_TABLE,
              Key: {
                HouseBillNo: { S: houseBill },
                UTCTimeStamp: { S: utcTimestamp },
              },
              UpdateExpression: "SET #attr = :val, UpdatedAt = :updatedAt, Message = :message",
              ExpressionAttributeNames: { "#attr": "ShipmentStatus" },
              ExpressionAttributeValues: {
                ":val": { S: "Skipped" },
                ":message": { S: "Data not oresent in shipment header table." },
                ":updatedAt": {
                  S: moment
                    .tz("America/Chicago")
                    .format("YYYY:MM:DD HH:mm:ss")
                    .toString()
                }
              },
            };
            console.info('🙂 -> file: index.js:125 -> module.exports.handler= -> locationParams:', locationParams);
            const locationResp = await update_dynamo_item(locationParams);
            console.info('🙂 -> file: index.js:126 -> module.exports.handler= -> locationResp:', locationResp);
          }
        } catch (error) {
          console.error(error);
        }
      } else {
        console.info("Ignored response");
      }
    }));
  } catch (error) {
    console.log(error);
    return callback(response("[400]", error));
  }
};
