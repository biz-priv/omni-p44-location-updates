const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
  console.log("event", JSON.stringify(event));
  try {
    
    if (event.Records[0].eventName !== 'INSERT') {
        return;
    }
    
    const houseBill = event.Records[0].dynamodb.NewImage.HouseBillNo.S;
    
    const params = {
        TableName: 'omni-wt-rt-shipment-header-<env>',
        Key: {
            BillNo: houseBill
        }
    };
    
    const response = await dynamoDB.get(params).promise();
    
    if (response.Item.Customer !== 'Mckesson') {
        return;
    }
    
    const newTable = 'omni-p44-location-sf-status-<env>';
    
    const newItem = {
        HouseBillNo: houseBill,
        StepFunctionStatus: 'Yet to be Processed'
    };
    
    const putParams = {
        TableName: newTable,
        Item: newItem
    };
    
    await dynamoDB.put(putParams).promise();
  } catch (error) {
    console.error(error);
    throw error;
  }
};
