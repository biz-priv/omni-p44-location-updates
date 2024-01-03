const { marshall } = require("@aws-sdk/util-dynamodb");
const { query_dynamo } = require("../shared/dynamoDb");
const { response, requester, authToken } = require("../shared/helper");
const AWS = require("aws-sdk");
const {SNS_TOPIC_ARN } = process.env;
const sns = new AWS.SNS({ region: process.env.REGION });
const {
  P44_LOCATION_UPDATE_TABLE,
  P44_API_URL,
  REFERENCE_TABLE,
  SHIPMENT_HEADER_TABLE,
  SHIPMENT_HEADER_TABLE_INDEX,
  REFERENCE_TABLE_INDEX,
  P44_LOCATION_UPDATE_TABLE_INDEX
} = process.env;
const { log, logUtilization } = require("../shared/logger");

module.exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  const { houseBill } = event;
  const accessToken = await authToken();
  console.log("accessToken", accessToken);
  let orderNumber = "";

  try {
    const shipmentParams = {
      TableName: SHIPMENT_HEADER_TABLE,
      IndexName: SHIPMENT_HEADER_TABLE_INDEX,
      KeyConditionExpression: "Housebill = :pk",
      ExpressionAttributeValues: marshall({
        ":pk": houseBill,
      }),
    };

    const shipmentData = await query_dynamo(shipmentParams);
    console.log("shipmentData", JSON.stringify(shipmentData));
    console.log(shipmentData.Items.length);

    if (shipmentData.Items.length > 0) {
      orderNumber = shipmentData?.Items[0]?.PK_OrderNo?.S;
    } else {
      return { errorMessage: "No data found in the Shipment-Header table" };
    }

    const refParams = {
      TableName: REFERENCE_TABLE,
      IndexName: REFERENCE_TABLE_INDEX,
      KeyConditionExpression: "FK_OrderNo = :order_no",
      FilterExpression:
        "CustomerType = :customer_type AND FK_RefTypeId IN (:ref_type1, :ref_type2)",
      ExpressionAttributeValues: marshall({
        ":order_no": orderNumber,
        ":customer_type": "B",
        ":ref_type1": "LOA",
        ":ref_type2": "BOL",
      }),
    };

    const referencesData = await query_dynamo(refParams);
    console.log("referencesData", JSON.stringify(referencesData));
    console.log(referencesData.Items.length);
    const value = referencesData?.Items[0]?.ReferenceNo?.S ?? "";

    const params = {
      TableName: P44_LOCATION_UPDATE_TABLE,
      IndexName: P44_LOCATION_UPDATE_TABLE_INDEX,
      KeyConditionExpression: "ShipmentStatus = :pk",
      FilterExpression: "HouseBillNo = :val",
      ExpressionAttributeValues: marshall({
        ":pk": "Complete",
        ":val": houseBill,
      }),
    };
    const locationData = await query_dynamo(params);
    console.log("locationData", JSON.stringify(locationData));
    console.log(locationData.Items.length);

    let sendResponse;
    for (let i = 0; i < locationData.Items.length; i++) {
      console.log("LoopCount", i);
      const correlationId = locationData.Items[i].CorrelationId.S;
      await logUtilization(correlationId);
      log(correlationId, JSON.stringify(event), 200);

      const p44Payload = {
        shipmentIdentifiers: [
          {
            type: "BILL_OF_LADING",
            value: value,
          },
        ],
        latitude: locationData.Items[i].latitude.N,
        longitude: locationData.Items[i].longitude.N,

        utcTimestamp: locationData.Items[i].UTCTimeStamp.S,
        customerId: "MCKESSON",
        eventType: "POSITION",
      };
      console.log("p44Payload", p44Payload);
      log(correlationId, JSON.stringify(p44Payload), 200);

      const options = {
        method: "POST",
        data: p44Payload,
        url: P44_API_URL,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      };

      sendResponse = await requester(options);
      console.log("sendResponse", sendResponse);
    }
    console.log("Response Send To P44 EndPoint");
  } catch (error) {
    console.log("Error", error);
    const params = {
			Message: `Error in ${functionName}, Error: ${error.Message}`,
			TopicArn: SNS_TOPIC_ARN,
		};
    await sns.publish(params).promise();
    return callback(response("[400]", "Second Lambda Failed"));
  }
};
