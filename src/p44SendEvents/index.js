const { marshall } = require("@aws-sdk/util-dynamodb");
const { query_dynamo } = require("../shared/dynamoDb");
const { response, requester } = require("../shared/helper");
const { P44_LOCATION_UPDATE_TABLE } = process.env;

module.exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  const { houseBill } = event;
  try {
    const params = {
      TableName: P44_LOCATION_UPDATE_TABLE,
      IndexName: "shipment-status-index-dev",
      KeyConditionExpression: "ShipmentStatus = :pk",
      FilterExpression: "HouseBillNo = :val",
      ExpressionAttributeValues: marshall({
        ":pk": "Pending",
        ":val": houseBill,
      }),
    };

    const locationData = await query_dynamo(params);
    console.log("locationData", JSON.stringify(locationData));
    const p44Payload = {
      shipmentIdentifiers: [
        {
          type: "BILL_OF_LADING",
          value: "string",
        },
      ],
      latitude: locationData.Items[0].latitude.N,
      longitude: locationData.Items[0].longitude.N,

      utcTimestamp: locationData.Items[0].UTCTimeStamp.S,
      customerId: "MCKESSON",
      eventType: "POSITION",
    };
    const options = {
      method: "POST",
      // auth: {
      //   username: USERNAME,
      //   password: PASSWORD,
      // },
      data: p44Payload,
      url: "https://na12.api.project44.com/api/v4/capacityproviders/tl/shipments/statusUpdates",
    };
    const sendResponse = await requester(options);
    console.log("sendResponse", sendResponse);
    console.log("Response Send To P44 EndPoint");
  } catch (error) {
    console.log("Error", error);
    return callback(response("[400]", "Second Lambda Failed"));
  }
};
