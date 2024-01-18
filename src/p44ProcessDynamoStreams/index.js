const { marshall } = require("@aws-sdk/util-dynamodb");
const { query_dynamo, put_dynamo } = require("../shared/dynamoDb");
const { log, logUtilization } = require("../shared/logger");
const { response } = require("../shared/helper");
const AWS = require("aws-sdk");
const {SNS_TOPIC_ARN } = process.env;
const sns = new AWS.SNS({ region: process.env.REGION });
const { CUSTOMER_MCKESSON, SHIPMENT_HEADER_TABLE, P44_SF_STATUS_TABLE,SHIPMENT_HEADER_TABLE_INDEX } =
  process.env;


module.exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  const customerIds = CUSTOMER_MCKESSON.split(",");
  const record = event.Records;

  try {
    for (let i = 0; i < record.length; i++) {
      console.log("loopCount==>", i);
      const houseBill = event.Records[i].dynamodb.NewImage.HouseBillNo.S;
      const correlationId = event.Records[i].dynamodb.NewImage.CorrelationId.S;
      await logUtilization(correlationId);
      log(correlationId, JSON.stringify(houseBill), 200);

      console.log("houseBill", houseBill);

      if (event.Records[i].eventName === "INSERT") {
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
            }
          } else {
            console.log("Ignored response");
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
    }
  } catch (error) {
    const params = {
			Message: `Error in ${context.functionName}, Error: ${error.message}`,
			TopicArn: SNS_TOPIC_ARN,
		};
    await sns.publish(params).promise();
    console.log(error);
    return callback(response("[400]", error));
  }
};
