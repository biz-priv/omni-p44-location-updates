const {
  DynamoDBClient,
  ListTablesCommand,
  DynamoDB,
  QueryCommand,
  PutItemCommand,
  UpdateItemCommand,
} = require("@aws-sdk/client-dynamodb");

const ddb_client = new DynamoDBClient();

async function query_dynamo(params) {
  return new Promise(async (resolve, reject) => {
    try {
      let res = await ddb_client.send(new QueryCommand(params));
      resolve(res);
    } catch (error) {
      console.log("query_dynamo Err", error);
      reject(error);
    }
  });
}

async function put_dynamo(params) {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await ddb_client.send(new PutItemCommand(params));
      resolve(res);
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
}

async function update_dynamo(params) {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await ddb_client.send(new UpdateItemCommand(params));
      resolve(res);
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
}

module.exports = { query_dynamo, put_dynamo, update_dynamo };

// const params = {
//   TableName: "MyTable",
//   Key: { "id": { S: "my-id" } },
//   UpdateExpression: "SET #attr1 = :val1",
//   ExpressionAttributeNames: { "#attr1": "myAttribute" },
//   ExpressionAttributeValues: { ":val1": { S: "my-new-value" } }
// };
