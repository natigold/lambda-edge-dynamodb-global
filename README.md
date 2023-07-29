# lambda-edge-dynamodb-global

This project contains source code and supporting files for a static website, based on an edge deployment of Cloudfront distribution, with L@E querying a DynamoDB Global table, that you can deploy with the SAM CLI. It includes the following files and folders.

- src/handlers/router-function - Code for the Lambda @ Edge function, retrieving an item from from DynamoDB by query params 
- src/handlers/copy-file - Code for the Lambda function which copies the static assets to the root S3 bucket
- src/init-table - Code for the Python script to synthisize 30K records into the DynamoDB table 
- assets - static assets/content for the website
- templates - Nested SAM/CloudFormation stacks that define the different components of the solution
- template.yaml - SAM main template that orchestrate the nested SAM templates

The application uses nested SAM/CloudFormation templates to deploy several AWS resources:
- shared-infra - S3 buckets for the static assets and logs
- routing-service - Lambda function and DynamoDB Global table to be used at the edge
- acm-config - ACM config and certificate 
- cloudfront-dist - Cloudfront distribution, securing the static website with security headers, associating the Labmda function as L@E
- domain-record - Route53 DNS record pointing to the Cloudfront distribution
- copy-resource - Lambda function and custom resource to copy the assets to the S3 root bucket

## Prerequisites
* SAM CLI - [Install the SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
* Node.js - [Install Node.js 18](https://nodejs.org/en/), including the NPM package management tool
* Docker - [Install Docker community edition](https://hub.docker.com/search/?type=edition&offering=community)
* Domain (optional) - a registered domain name, such as example.com, pointed to a Route 53 hosted zone in the same AWS account in which you deploy this solution. In case you do not have a domain, you may still deploy this solution by setting the `CreateDNS` parameter to false

## Deploy the solution

To build and deploy your application for the first time, run the following in your shell:

```bash
make package-static
sam build
sam deploy --guided --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND --parameter-overrides ParameterKey=SubDomain,ParameterValue=www ParameterKey=DomainName,ParameterValue=example.com ParameterKey=HostedZoneId,ParameterValue=ZZZZZZZZZ ParameterKey=CreateApex,ParameterValue=no ParameterKey=CreateDNS,ParameterValue=yes
```

The first `MAKE` command will build and package the custom resource needed to copy the static assets of the website.
The second command will build the source of your application. The third will package and deploy the solution to AWS, using the following parameters which you will need to adjust:

* **CreateDNS** (optional): Optionally create a Route53 A record and CloudFront distribution. Default is [yes]
* **SubDomain** (optional): the sub domain that will be used to point to the static website. Defaults to [www]. 
* **DomainName** (optional): the domain name (e.g. example.com) pointed to Route53. Only required if used together with `CreateDNS=true`.
* **HostedZoneId** (optional): Route53 Hosted Zone Id used to host the chosen domain's DNS records. Only required if used together with `CreateDNS=true`.
* **CreateApex** (optional): Creates an Alias to the domain apex (example.com) in your CloudFront configuration. Default is [no]
* **ContentVersionId** (optional): static content version number. Default is [1.0]

`SAM CLI` will then display a series of prompts:

* **Stack Name**: The name of the stack to deploy to CloudFormation. This should be unique to your account and region, and a good starting point would be something matching your project name.
* **AWS Region**: The AWS region you want to deploy your app to.
* **Confirm changes before deploy**: If set to yes, any change sets will be shown to you before execution for manual review. If set to no, the AWS SAM CLI will automatically deploy application changes.
* **Allow SAM CLI IAM role creation**: Many AWS SAM templates, including this example, create AWS IAM roles required for the AWS Lambda function(s) included to access AWS services. By default, these are scoped down to minimum required permissions. To deploy an AWS CloudFormation stack which creates or modifies IAM roles, the `CAPABILITY_IAM` value for `capabilities` must be provided. If permission isn't provided through this prompt, to deploy this example you must explicitly pass `--capabilities CAPABILITY_IAM` to the `sam deploy` command.
* **Save arguments to samconfig.toml**: If set to yes, your choices will be saved to a configuration file inside the project, so that in the future you can just re-run `sam deploy` without parameters to deploy changes to your application.

You can find your DynamoDB table name, and CloudFront distribution ID in the output values displayed after deployment.

## Post-deployment

After the deployment, you may want to populate the DynamoDB table with records. Copy the name of the DynamoDB table from the output section of the SAM CLI deployment, and then run the following in your shell:

```bash
python3 src/init-table/init-script.py table_name=paste_your_table_name_here
```

## Cleanup

To delete the solution use the AWS SAM CLI. Assuming you created your stack from the main template, you can run the following:

```bash
make clean
sam delete
```

** Note,** that some resources main be retained even after the stack was deleted, such as the S3 buckets created, CloudWatch logs, and more. You may need to delete those manually, if you so require.