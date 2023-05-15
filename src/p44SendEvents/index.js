const { marshall } = require("@aws-sdk/util-dynamodb");
const { query_dynamo } = require("../shared/dynamoDb");
const { response, requester, authToken } = require("../shared/helper");
const { P44_LOCATION_UPDATE_TABLE, SF_TABLE_INDEX_KEY, P44_API_URL } =
  process.env;
const REFERENCE_TABLE = "omni-wt-rt-references-dev";

module.exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  const { houseBill } = event;
  const accessToken = await authToken();
  console.log("accessToken", accessToken);

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

    const refParams = {
      TableName: REFERENCE_TABLE,
      IndexName: "omni-wt-rt-ref-orderNo-index-dev",
      KeyConditionExpression: "FK_OrderNo = :order_no",
      FilterExpression:
        "CustomerType = :customer_type AND FK_RefTypeId IN (:ref_type1, :ref_type2)",
      ExpressionAttributeValues: marshall({
        ":order_no": houseBill,
        ":customer_type": "B",
        ":ref_type1": "LOA",
        ":ref_type2": "BOL",
      }),
    };

    const locationData = await query_dynamo(params);
    console.log("locationData", JSON.stringify(locationData));
    console.log(locationData.Items.length);

    const referencesData = await query_dynamo(refParams);
    console.log("referencesData", JSON.stringify(referencesData));
    console.log(referencesData.Items.length);
    const value = referencesData?.Items[0]?.PK_ReferenceNo?.S ?? "";

    let sendResponse;
    for (let i = 0; i < locationData.Items.length; i++) {
      console.log("LoopCount", i);
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
      console.log("sendResponse", JSON.stringify(sendResponse));
    }

    console.log("Response Send To P44 EndPoint");
  } catch (error) {
    console.log("Error", error);
    return callback(response("[400]", "Second Lambda Failed"));
  }
};
