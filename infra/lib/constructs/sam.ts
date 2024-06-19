/* eslint-disable @typescript-eslint/no-unused-vars */
import { CfnApplication } from 'aws-cdk-lib/aws-sam'

import { Construct } from 'constructs'
import { config } from '../../config'

interface IAthenaToDynamoDBConnectorProps {
  spillBucketName: string
}

// SAM Lambda application that connects Athena to DynamoDB
export class AthenaToDynamoDBConnector {
  public readonly application: CfnApplication
  public readonly lambdaArn: string

  constructor(scope: Construct, props: IAthenaToDynamoDBConnectorProps) {
    const lambdaName = `${config.projectName}-connect-athena-dynamodb`

    this.lambdaArn = `arn:aws:lambda:${config.validatedEnvs.AWS_DEFAULT_REGION}:${config.validatedEnvs.CDK_DEFAULT_ACCOUNT}:function:${lambdaName}`

    this.application = new CfnApplication(scope, lambdaName, {
      location: {
        applicationId:
          'arn:aws:serverlessrepo:us-east-1:292517598671:applications/AthenaDynamoDBConnector',
        semanticVersion: '2022.34.1',
      },
      parameters: {
        AthenaCatalogName: lambdaName,
        SpillBucket: props.spillBucketName,
      },
      tags: {
        SAMApplication: 'AthenaDynamoDBConnector',
      },
    })
  }
}
