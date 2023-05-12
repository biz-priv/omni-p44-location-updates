const { marshall } = require("@aws-sdk/util-dynamodb");
const { query_dynamo } = require("../shared/dynamoDb");
const { response, requester } = require("../shared/helper");
const { P44_LOCATION_UPDATE_TABLE, SF_TABLE_INDEX_KEY, P44_API_URL } =
  process.env;

module.exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  const { houseBill } = event;

  try {
    const params = {
      TableName: P44_LOCATION_UPDATE_TABLE,
      IndexName: SF_TABLE_INDEX_KEY,
      KeyConditionExpression: "ShipmentStatus = :pk",
      FilterExpression: "HouseBillNo = :val",
      ExpressionAttributeValues: marshall({
        ":pk": "Pending",
        ":val": houseBill,
      }),
    };

    const locationData = await query_dynamo(params);
    console.log("locationData", JSON.stringify(locationData));

    let sendResponse;
    for (let i = 0; i < array.length; i++) {
      const p44Payload = {
        shipmentIdentifiers: [
          {
            type: "BILL_OF_LADING",
            value: "string",
          },
        ],
        latitude: locationData.Items[i].latitude.N,
        longitude: locationData.Items[i].longitude.N,

        utcTimestamp: locationData.Items[i].UTCTimeStamp.S,
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
        url: P44_API_URL,
      };

      sendResponse = await requester(options);
    }

    console.log("sendResponse", sendResponse);
    console.log("Response Send To P44 EndPoint");
  } catch (error) {
    console.log("Error", error);
    return callback(response("[400]", "Second Lambda Failed"));
  }
};
