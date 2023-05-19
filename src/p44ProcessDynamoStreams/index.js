const { marshall } = require("@aws-sdk/util-dynamodb");
const { query_dynamo, put_dynamo } = require("../shared/dynamoDb");
const { log, logUtilization } = require("../shared/logger");
const { response } = require("../shared/helper");
const { CUSTOMER_MCKESSON, SHIPMENT_HEADER_TABLE, P44_SF_STATUS_TABLE } =
  process.env;

module.exports.handler = async (event, context, callback) => {
  event = {
    Records: [
      {
        eventID: "7aa1651cffbd4d2afb4156f3c04906d1",
        eventName: "INSERT",
        eventVersion: "1.1",
        eventSource: "aws:dynamodb",
        awsRegion: "us-east-1",
        dynamodb: {
          ApproximateCreationDateTime: 1684510657,
          Keys: {
            UTCTimeStamp: {
              S: "2023-05-19T15:26:00",
            },
            HouseBillNo: {
              S: "74354",
            },
          },
          NewImage: {
            ShipmentStatus: {
              S: "In-Complete",
            },
            UTCTimeStamp: {
              S: "2023-05-19T15:26:00",
            },
            InsertedTimeStamp: {
              S: "2023:05:19 10:37:37",
            },
            latitude: {
              N: "33.064756",
            },
            CorrelationId: {
              S: "4a79efad-1a58-4f22-ba5c-c5cd45ae9686",
            },
            HouseBillNo: {
              S: "74354",
            },
            longitude: {
              N: "-89.904472",
            },
          },
          SequenceNumber: "52616600000000036816077211",
          SizeBytes: 232,
          StreamViewType: "NEW_AND_OLD_IMAGES",
        },
        eventSourceARN:
          "arn:aws:dynamodb:us-east-1:332281781429:table/omni-p44-shipment-location-updates-dev/stream/2023-05-08T15:17:39.737",
      },
      {
        eventID: "7aa1651cffbd4d2afb4156f3c04906d1",
        eventName: "INSERT",
        eventVersion: "1.1",
        eventSource: "aws:dynamodb",
        awsRegion: "us-east-1",
        dynamodb: {
          ApproximateCreationDateTime: 1684510657,
          Keys: {
            UTCTimeStamp: {
              S: "2023-05-19T15:26:00",
            },
            HouseBillNo: {
              S: "74354",
            },
          },
          NewImage: {
            ShipmentStatus: {
              S: "In-Complete",
            },
            UTCTimeStamp: {
              S: "2023-05-19T15:26:00",
            },
            InsertedTimeStamp: {
              S: "2023:05:19 10:37:37",
            },
            latitude: {
              N: "33.064756",
            },
            CorrelationId: {
              S: "4a79efad-1a58-4f22-ba5c-c5cd45ae9686",
            },
            HouseBillNo: {
              S: "74354",
            },
            longitude: {
              N: "-89.904472",
            },
          },
          SequenceNumber: "52616600000000036816077211",
          SizeBytes: 232,
          StreamViewType: "NEW_AND_OLD_IMAGES",
        },
        eventSourceARN:
          "arn:aws:dynamodb:us-east-1:332281781429:table/omni-p44-shipment-location-updates-dev/stream/2023-05-08T15:17:39.737",
      },
    ],
  };
  console.log("event", JSON.stringify(event));
  const customerIds = CUSTOMER_MCKESSON.split(",");
  const record = event.Records;

  try {
    for (let i = 0; i < record.length; i++) {
      console.log("loopCount==>", i);
      const houseBill = event.Records[i].dynamodb.NewImage.HouseBillNo.S;
      const correlationId = event.Records[i].dynamodb.NewImage.CorrelationId.S;
      await logUtilization(correlationId);

      console.log("houseBill", houseBill);

      if (event.Records[i].eventName === "INSERT") {
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

              // const res = await put_dynamo(dynamoParams);
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
    console.log(error);
    return callback(response("[400]", error));
  }
};
