const { marshall } = require("@aws-sdk/util-dynamodb");
const { query_dynamo, put_dynamo, update_dynamo_item } = require("../shared/dynamoDb");
const { log, logUtilization } = require("../shared/logger");
const { response } = require("../shared/helper");
const moment = require("moment-timezone");
const { CUSTOMER_MCKESSON, SHIPMENT_HEADER_TABLE, P44_SF_STATUS_TABLE, SHIPMENT_HEADER_TABLE_INDEX, P44_LOCATION_UPDATE_TABLE, BIO_RAD_BILL_TO_NUMBERS, BIO_RAD_SQS_URL } =
  process.env;
const AWS = require('aws-sdk');
const sqs = new AWS.SQS();

module.exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  const customerIds = CUSTOMER_MCKESSON.split(",");
  const bioRadCustomerIds = BIO_RAD_BILL_TO_NUMBERS.split(",");
  console.info('bioRadCustomerIds: ', bioRadCustomerIds)
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
            if (customerIds.includes(billNumber)) {
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

              const res = await put_dynamo(dynamoParams);
              // console.log("response", res);
            }else if (bioRadCustomerIds.includes(billNumber)) {

              console.info('bioRadCustomerIds: ', bioRadCustomerIds)
              console.info("billNumber: ", billNumber);
              const sqsParams = {
                MessageBody: JSON.stringify(record),
                QueueUrl: BIO_RAD_SQS_URL,
              };
              console.info(sqsParams)
              await sqs.sendMessage(sqsParams).promise();

            } else {
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
                  ":message": { S: `${billNumber} is not one of ${customerIds}` },
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
            // throw "Ignored response";
          }
        } catch (error) {
          console.error(error);
          // return callback(response("[400]", "Failed"));
          // throw "Not an Insert Event";
        }
      } else {
        // throw "Not an Insert Event";
        console.log("Ignored response");
      }
    }));
  } catch (error) {
    console.log(error);
    return callback(response("[400]", error));
  }
};
