const AWS = require("aws-sdk");
const sqs = new AWS.SQS();
const axios = require("axios");
const { P44_CLIENT_ID, P44_CLIENT_SECRET, P44_AUTH_API } = process.env;

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
      const message = err?.response?.data?.errors ?? err?.message;
      reject({ error: message });
    }
  });
}

async function authToken() {
  const formData = {
    client_id: P44_CLIENT_ID,
    client_secret: P44_CLIENT_SECRET,
    grant_type: "client_credentials",
  };

  const resp = await axios
    .post(P44_AUTH_API, new URLSearchParams(formData).toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })
    .then((res) => res.data)
    .catch((err) => console.error(err));

  console.log(resp);
  const accToken = resp.access_token;
  return accToken;
}

module.exports = { send_message, response, requester, authToken };
