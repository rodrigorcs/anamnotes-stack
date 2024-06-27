import { Construct } from 'constructs'
import { RemovalPolicy, aws_s3 as s3 } from 'aws-cdk-lib'
import { config } from '../../../config'
import { stageValue } from '../../helpers'

interface IS3BucketProps {
  name: string
  encryption?: boolean
}

export class S3Bucket {
  public readonly bucket: s3.Bucket

  constructor(scope: Construct, props: IS3BucketProps) {
    const bucketName = `${config.projectName}-${props.name}-bucket`
    this.bucket = new s3.Bucket(scope, bucketName, {
      versioned: false,
      bucketName,
      eventBridgeEnabled: true,
      publicReadAccess: false,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: stageValue({ production: false }, true),
      removalPolicy: stageValue({ production: RemovalPolicy.RETAIN }, RemovalPolicy.DESTROY),
      encryption: props.encryption ? s3.BucketEncryption.S3_MANAGED : undefined,
    })
  }
}

export const S3EventType = s3.EventType
