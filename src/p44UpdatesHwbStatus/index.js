const { marshall } = require("@aws-sdk/util-dynamodb");
const { response } = require("../shared/helper");
const { log, logUtilization } = require("../shared/logger");
const {
  put_dynamo,
  delete_dynamo_item,
  update_dynamo_item,
  query_dynamo,
} = require("../shared/dynamoDb");
const AWS = require("aws-sdk");
const {SNS_TOPIC_ARN } = process.env;
const sns = new AWS.SNS({ region: process.env.REGION });
const { P44_LOCATION_UPDATE_TABLE, P44_SF_STATUS_TABLE,P44_LOCATION_UPDATE_TABLE_INDEX } = process.env;

//=============>
const AWS = require("aws-sdk");
var ddb = new AWS.DynamoDB.DocumentClient();
let items;
let queryResults = [];

module.exports.handler = async (event, context, callback) => {
  console.log("event", JSON.stringify(event));
  console.log("event==>", typeof event);
  const stepEvent = event;

  try {
    let keys = stepEvent.dynamodb.Keys;
    const houseBill = keys.HouseBillNo.S;
    const sfStatus = keys.StepFunctionStatus.S;
    let locationStatus = "";
    let correlationId = "";

    if (keys.StepFunctionStatus.S === "Yet to be Processed") {
      locationStatus = "In-Complete";
    }

    // For SF_Status--------------------------------------------------------------------->
    let sfDynamoPayload = {
      HouseBillNo: houseBill,
      StepFunctionStatus: "Pending",
    };
    sfDynamoPayload = marshall(sfDynamoPayload);

    const sfParams = {
      TableName: P44_SF_STATUS_TABLE,
      Item: sfDynamoPayload,
    };

    const sfDltParams = {
      TableName: P44_SF_STATUS_TABLE,
      Key: {
        HouseBillNo: { S: houseBill },
        StepFunctionStatus: { S: sfStatus },
      },
    };
    // Query Location updates --------------------------------------------------------------------------------------------->
    const params = {
      TableName: P44_LOCATION_UPDATE_TABLE,
      IndexName: P44_LOCATION_UPDATE_TABLE_INDEX,
      KeyConditionExpression: "ShipmentStatus = :pk",
      FilterExpression: "HouseBillNo = :val",
      ExpressionAttributeValues: {
        ":pk": locationStatus,
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
    console.log("locationData", JSON.stringify(locationData));
    //--------------------------------------------------------------------------------------------->

    // console.log("sfParams", sfParams);
    // console.log("locationParams", locationParams);

    // Update SF_Status---------------------------------------------------------------------------->
    const sfDlt = await delete_dynamo_item(sfDltParams);
    const sfResp = await put_dynamo(sfParams);
    console.log("Udated Successfully in P44_SF_STATUS_TABLE", sfResp);

    // Update Location_Updates----------------------------------------------------------------------->
    let locationResp;
    if (locationData.length > 0) {
      for (let i = 0; i < locationData.length; i++) {
        const utcTimeStamp = locationData[i].UTCTimeStamp;
        correlationId = locationData[i].CorrelationId;
        log(correlationId, JSON.stringify(utcTimeStamp), 200);

        console.log(`utcTimeStamp ${i}=====>`, utcTimeStamp);
        const locationParams = {
          TableName: P44_LOCATION_UPDATE_TABLE,
          Key: {
            HouseBillNo: { S: houseBill },
            UTCTimeStamp: { S: utcTimeStamp },
          },
          UpdateExpression: "SET #attr = :val",
          ExpressionAttributeNames: { "#attr": "ShipmentStatus" },
          ExpressionAttributeValues: {
            ":val": { S: "Pending" },
          },
        };
        locationResp = await update_dynamo_item(locationParams);
      }
    }

    console.log(
      "Udated Successfully in P44_LOCATION_UPDATE_TABLE",
      locationResp
    );
    log(correlationId, JSON.stringify(event), 200);
    log(correlationId, JSON.stringify(locationResp), 200);
    await logUtilization(correlationId);

    return { houseBill };
  } catch (error) {
    console.log("Error", error);
    const params = {
			Message: `Error in ${functionName}, Error: ${error.Message}`,
			TopicArn: SNS_TOPIC_ARN,
		};
    await sns.publish(params).promise();
    return callback(response("[400]", "First Lambda Failed"));
  }
};
