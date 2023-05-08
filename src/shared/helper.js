const AWS = require("aws-sdk");
const sqs = new AWS.SQS();

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
module.exports = { send_response, send_message, response };
