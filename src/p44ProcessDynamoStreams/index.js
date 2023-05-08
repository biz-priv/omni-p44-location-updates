const { marshall } = require("@aws-sdk/util-dynamodb");
const { query_dynamo, put_dynamo } = require("../shared/dynamoDb");
const { log, logUtilization } = require("../shared/logger");
const { CUSTOMER_MCKESSON, SHIPMENT_HEADER_TABLE } = process.env;

module.exports.handler = async (event, context) => {
  console.log("event", JSON.stringify(event));
  const houseBill = event.Records[0].dynamodb.NewImage.HouseBillNo.S;
  const newTable = "omni-p44-location-sf-status-dev";

  try {
    const params = {
      TableName: SHIPMENT_HEADER_TABLE,
      IndexName: "Housebill-index",
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
      await logUtilization(billNumber);

      console.log("billNumber", billNumber);
      if (CUSTOMER_MCKESSON.includes(billNumber)) {
        console.log("billNumber", billNumber);
        let dynamoPayload = {
          HouseBillNo: houseBill,
          StepFunctionStatus: "Yet to be Processed",
        };
        dynamoPayload = marshall(dynamoPayload);

        const dynamoParams = {
          TableName: newTable,
          Item: dynamoPayload,
        };

        console.log("dynamoParams", JSON.stringify(dynamoParams));

        const res = await put_dynamo(dynamoParams);
        console.log("response", res);
      }
    } else {
      console.log("Ignored response");
      return callback(response("[400]", "Ignored response"));
    }
  } catch (error) {
    console.error(error);
    return callback(response("[400]", "Failed"));
  }
};

function response(code, message) {
  return JSON.stringify({
    statusCode: code,
    message,
  });
}
