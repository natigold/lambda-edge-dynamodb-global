/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html 
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 * 
 */

import { GetItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import * as f from 'util'

const TABLE_NAME = 'RoutingUrlTable';
const REGION = process.env.AWS_REGION;
let ddbClient = new DynamoDBClient({ region: REGION });

export const lambdaHandler = async (event, context, callback) => {

    console.log("event: ", event);
    console.log("context: ", context);

    const request = event.Records[0].cf.request;
    console.log("cf request: ", request);

    const searchParams = new URLSearchParams(request.querystring);

    if (searchParams.has('url') && searchParams.has('type')) {
      console.log("url and type found: ", searchParams.get('url'), searchParams.get('type'));

      const timestamp1 = new Date().getTime();
      const item = await getRecordByUrlAndType(searchParams.get('url'), searchParams.get('type'));
      const timestamp2 = new Date().getTime();
      const elapseTime = timestamp2 - timestamp1;
      console.log("time taken: ", elapseTime);

      if (item && item.Item) {
        request.headers['x-route-item'] = [{key: 'X-Route-Item', value: JSON.stringify(item.Item)}]; 
        request.headers['x-route-latency'] = [{key: 'X-Route-Latency', value: elapseTime.toString()}]; 
        
        console.log("header: ", request.headers);
      }
    }

    callback(null, request);
};

const getRecordByUrlAndType = async (url, type) => {
  // Get an item from DynamoDB table by partition key and sort key
  let item;

  const params = {
    TableName: TABLE_NAME,
    Key: {
        url: { S: url },
        type: { S: type }
    }
  };

  if (!ddbClient) {
    ddbClient = new DynamoDBClient({ region: REGION });
  }

  const command = new GetItemCommand(params);

  try {
    let response = await ddbClient.send(command);
    item = response;
    console.log("Item: ", item);
  } catch (err) {
    console.log("Error", err); 
  }

  return item;
}