import { GetItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import dns from 'dns/promises'

const TABLE_NAME = 'RoutingUrlTable';
const DEFAULT_REGION = 'us-east-1';
const REGIONS = ['us-east-1', 'eu-west-1', 'ap-southeast-1', 'eu-central-1'];
const REGION = process.env.AWS_REGION;

let domainName;
let ddbClient = new DynamoDBClient({ region: REGIONS.indexOf(REGION) > -1 ? REGION : REGION });

export const lambdaHandler = async (event, context, callback) => {

    const request = event.Records[0].cf.request;
    console.log("cf request: ", request);

    // Get a latency based connection to DynamoDB only if the current region isn't supported
    // or current connection is invalid 
    if (!ddbClient || (!domainName && REGIONS.indexOf(REGION) == -1)) {
      domainName = request.headers['host'][0].value;
      console.log("Setting domain: ", domainName);

      ddbClient = getDynamoDBConnection();
    }

    const searchParams = new URLSearchParams(request.querystring);

    if (searchParams.has('url') && searchParams.has('type')) {
      console.log("url and type found: ", searchParams.get('url'), searchParams.get('type'));

      // Measure the latency of calling DynamoDB Global table
      const timestamp1 = new Date().getTime();
      const item = await getRecordByUrlAndType(searchParams.get('url'), searchParams.get('type'));
      const timestamp2 = new Date().getTime();
      const elapseTime = timestamp2 - timestamp1;
      console.log("DynamoDB latency (ms): ", elapseTime);

      // If item was found check for redirection settings
      if (item && item.Item) {

        // If status is active, redirect to the URL
        if (item.Item.status.BOOL) {
          const response = {
            status: '302',
            statusDescription: 'Found',
            headers: {
                location: [{
                    key: 'Location',
                    value: item.Item.url.S,
                }],
            },
          };

          console.log('Redirecting to: ', item.Item.url.S);

          callback(null, response);
        }

        request.headers['x-route-item'] = [{key: 'X-Route-Item', value: JSON.stringify(item.Item)}]; 
        console.log("Added headers: ", request.headers);
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

  const command = new GetItemCommand(params);

  try {
    let response = await ddbClient.send(command);
    item = response;
    console.log("Item: ", item);
  } catch (err) {
    console.log("Error", err); 
  }

  return item;
};

const getDynamoDBConnection = async () => {
  let region = DEFAULT_REGION;

  if (REGIONS.indexOf(REGION) > -1) {
    region = REGION;
  } else {
    region = domainName ? await getLatencyRegion(domainName) : DEFAULT_REGION;
  }
  console.log("Connecting to DynanmoDB in region: ", region);

  return new DynamoDBClient({ region: region });
};

const getLatencyRegion = async (domainName) => {
  let lowestLatencyRegion = DEFAULT_REGION;

  try {
    const res = await dns.resolveTxt(domainName);
    lowestLatencyRegion = res[0][0]
  } catch (err) {
    console.log("Error retrieving latency record", err);
  }

  return lowestLatencyRegion;
};