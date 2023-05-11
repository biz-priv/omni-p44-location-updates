# omni-p44-location-updates

Location Updates from Ivia and Live to be sent to Project44 Customers

# QueueUrl:

"https://sqs.us-east-1.amazonaws.com/332281781429/omni-p44-location-updates-queue-dev",

# SSM

/omni-p44/location-updates/dev/source/ddb.table_name
/omni-p44/location-updates/dev/source/ddb.table_arn
/omni-p44/location-updates/dev/source/ddb.stream_arn
/omni-p44/location-updates/dev/source/ddb.shipmentStatus_index

/omni-p44/location-updates/dev/stepFunction-status/ddb.table_name
/omni-p44/location-updates/dev/stepFunction-status/ddb.table_arn
/omni-p44/location-updates/dev/stepFunction-status/ddb.stream_arn
/omni-p44/location-updates/dev/stepFunction-status/ddb.stepFunctionStatus_index

/omni-p44/location-updates/dev/source/state_machine_arn

/omni-p44/location-updates/dev/source/API.url
/omni-p44/location-updates/dev/source/SQS.queue_url
