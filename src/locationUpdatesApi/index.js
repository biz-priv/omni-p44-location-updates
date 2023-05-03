const { query_dynamo } = require("../shared/dynamoDb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const { locationUpdateSchema } = require("../shared/joiSchema");
const { SHIPMENT_HEADER_TABLE, CUSTOMER_MCKESSON } = process.env;

module.exports.handler = async (event, context, callback) => {
  console.log("Event", JSON.stringify(event));
  const body = event.body;
  const housebill = body.housebill;
  const correlationId = body.correlationId;

  try {
    try {
      await locationUpdateSchema.validateAsync(body);
    } catch (error) {
      let err = error.details[0].message;
      return { errorMessage: err };
    }
    const params = {
      TableName: SHIPMENT_HEADER_TABLE,
      IndexName: "Housebill-index",
      KeyConditionExpression: "Housebill = :pk",
      ExpressionAttributeValues: marshall({
        ":pk": housebill,
      }),
    };
    const shipmetData = await query_dynamo(params);
    console.log("shipmetData", JSON.stringify(shipmetData));

    if (shipmetData.Items.length > 0) {
      const billNumber = shipmetData.Items[0].BillNo.S;
      console.log("billNumber", billNumber);
      if (CUSTOMER_MCKESSON.includes(billNumber)) {
        return {
          locationUpdateResponse: {
            message: "Success",
          },
        };
      }
    } else {
      return { errorMessage: "Ignored response" };
    }
  } catch (error) {
    return callback(response("[400]", error));
  }
};

function response(code, message) {
  return JSON.stringify({
    statusCode: code,
    message,
  });
}
