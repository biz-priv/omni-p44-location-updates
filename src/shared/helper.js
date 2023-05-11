const AWS = require("aws-sdk");
const sqs = new AWS.SQS();
const axios = require("axios");

function send_response(http_code, resp) {
  let responseData;
  if (resp) {
    responseData = resp;
  }
  return {
    statusCode: http_code,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(responseData),
  };
}

async function send_message(params) {
  return new Promise(async (resolve, reject) => {
    try {
      let queueRes = await sqs.sendMessage(params).promise();
      resolve(queueRes);
    } catch (error) {
      console.log("sqs push message error", error);
      reject(error);
    }
  });
}
function response(code, message) {
  return JSON.stringify({
    statusCode: code,
    message,
  });
}

async function requester(options) {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await axios(options);
      resolve(data);
    } catch (err) {
      console.log("error", err);
      reject({ error: err.message });
    }
  });
}

module.exports = { send_response, send_message, response, requester };
