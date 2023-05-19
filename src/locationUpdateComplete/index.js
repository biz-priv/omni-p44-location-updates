const { response } = require("../shared/helper");
const { log, logUtilization } = require("../shared/logger");

module.exports.handler = async (event, context, callback) => {
  console.log("Event", JSON.stringify(event));
  try {
    return callback(response("[200]", "Statue Update Complete"));
  } catch (error) {
    return callback(response("[400]", "Statue Update Failed"));
  }
};
