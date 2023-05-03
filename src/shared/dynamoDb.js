const {
  DynamoDBClient,
  ListTablesCommand,
  DynamoDB,
  QueryCommand,
  PutItemCommand,
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

module.exports = { query_dynamo };
