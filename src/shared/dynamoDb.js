/*
* File: src\shared\dynamoDb.js
* Project: Omni-p44-location-updates
* Author: Bizcloud Experts
* Date: 2023-08-04
* Confidential and Proprietary
*/
const {
  DynamoDBClient,
  ListTablesCommand,
  DynamoDB,
  QueryCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} = require("@aws-sdk/client-dynamodb");

const ddb_client = new DynamoDBClient();

async function query_dynamo(params) {
  try {
    let res = await ddb_client.send(new QueryCommand(params));
    return res;
  } catch (error) {
    console.log("query_dynamo Err", error);
    throw error;
  }
}

async function put_dynamo(params) {
  try {
    const res = await ddb_client.send(new PutItemCommand(params));
    return res;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function update_dynamo_item(params) {
  try {
    const res = await ddb_client.send(new UpdateItemCommand(params));
    return res;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function delete_dynamo_item(params) {
  try {
    const res = await ddb_client.send(new DeleteItemCommand(params));
    console.log("Item Deleted");
    return res;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

module.exports = {
  query_dynamo,
  put_dynamo,
  update_dynamo_item,
  delete_dynamo_item,
};
