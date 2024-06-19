import { Construct } from 'constructs'
import { RemovalPolicy, aws_s3 as s3, aws_iam as iam } from 'aws-cdk-lib'
import { cdkUtils } from '@getgreenline/infra-utils'
import { config } from '../../config'
import { toCamelCase } from '../utils'
import {
  PolicyStatement,
  Effect,
  ArnPrincipal,
  Policy,
  PolicyDocument,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam'
import { CfnBucket } from 'aws-cdk-lib/aws-s3'

interface IS3BucketProps {
  name: string
  encryption?: boolean
  readonlyExternalPrincipalArns?: string[]
  writeAccessPrincipalArns?: string[]
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
      autoDeleteObjects: cdkUtils.stageValue({ production: false }, true),
      removalPolicy: cdkUtils.stageValue(
        { production: RemovalPolicy.RETAIN },
        RemovalPolicy.DESTROY,
      ),
      encryption: props.encryption ? s3.BucketEncryption.S3_MANAGED : undefined,
    })

    if (props.readonlyExternalPrincipalArns) {
      const allowExternalReadAccessPolicy = new iam.PolicyStatement({
        sid: `Allow${toCamelCase(props.name)}ReadAccessFromPartner`,
        effect: iam.Effect.ALLOW,
        resources: [this.bucket.bucketArn, this.bucket.arnForObjects('*')],
        actions: ['s3:ListBucket', 's3:GetObject'],
        principals: props.readonlyExternalPrincipalArns.map((arn) => new iam.ArnPrincipal(arn)),
      })
      this.bucket.addToResourcePolicy(allowExternalReadAccessPolicy)
    }
  }
}

interface IExistingS3BucketProps {
  bucketName: string
}

export class ExistingS3Bucket {
  public readonly bucket: s3.IBucket

  constructor(scope: Construct, props: IExistingS3BucketProps) {
    this.bucket = s3.Bucket.fromBucketName(scope, props.bucketName, props.bucketName)
  }
}

interface IS3ReplicationDestinationBucketProps {
  name: string
  encryption?: boolean
  crossAccountRoleArn: string
}

export class S3ReplicationDestinationBucket {
  public readonly bucket: s3.Bucket

  constructor(scope: Construct, props: IS3ReplicationDestinationBucketProps) {
    const bucketName = `${config.projectName}-${props.name}-bucket`
    this.bucket = new s3.Bucket(scope, bucketName, {
      versioned: true,
      bucketName,
      eventBridgeEnabled: true,
      publicReadAccess: false,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: cdkUtils.stageValue({ production: false }, true),
      removalPolicy: cdkUtils.stageValue(
        { production: RemovalPolicy.RETAIN },
        RemovalPolicy.DESTROY,
      ),
      encryption: props.encryption ? s3.BucketEncryption.S3_MANAGED : undefined,
    })

    this.bucket.addToResourcePolicy(
      new PolicyStatement({
        sid: 'Set Admin Access',
        effect: Effect.ALLOW,
        principals: [new ArnPrincipal(`arn:aws:iam::${config.stack.env.account}:root`)],
        actions: ['s3:*'],
        resources: [`${this.bucket.bucketArn}`, `${this.bucket.bucketArn}/*`],
      }),
    )

    // allow the objects in the bucket to be replicated or deleted
    this.bucket.addToResourcePolicy(
      new PolicyStatement({
        sid: 'Set permissions for Objects',
        effect: Effect.ALLOW,
        principals: [new ArnPrincipal(props.crossAccountRoleArn)],
        actions: ['s3:ReplicateObject', 's3:ReplicateDelete'],
        resources: [`${this.bucket.bucketArn}/*`],
      }),
    )

    // allow the files in the bucket to be listed or versioned
    this.bucket.addToResourcePolicy(
      new PolicyStatement({
        sid: 'Set permissions on bucket',
        effect: Effect.ALLOW,
        principals: [new ArnPrincipal(props.crossAccountRoleArn)],
        actions: ['s3:List*', 's3:GetBucketVersioning', 's3:PutBucketVersioning'],
        resources: [this.bucket.bucketArn],
      }),
    )

    // allows the ownership to change from the source bucket to the destination bucket
    this.bucket.addToResourcePolicy(
      new PolicyStatement({
        sid: 'Allow ownership change',
        effect: Effect.ALLOW,
        principals: [new ArnPrincipal(props.crossAccountRoleArn)],
        actions: [
          's3:ReplicateObject',
          's3:ReplicateDelete',
          's3:ObjectOwnerOverrideToBucketOwner',
          's3:ReplicateTags',
          's3:GetObjectVersionTagging',
        ],
        resources: [`${this.bucket.bucketArn}/*`],
      }),
    )
  }
}

interface IS3ReplicationSourceBucketProps {
  name: string
  encryption?: boolean
  destinationBucketName: string
  destinationAccountId: string
}

export class S3ReplicationSourceBucket {
  public readonly bucket: s3.Bucket

  constructor(scope: Construct, props: IS3ReplicationSourceBucketProps) {
    const bucketName = `${config.projectName}-${props.name}-bucket`
    this.bucket = new s3.Bucket(scope, bucketName, {
      versioned: true,
      bucketName,
      eventBridgeEnabled: true,
      publicReadAccess: false,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: cdkUtils.stageValue({ production: false }, true),
      removalPolicy: cdkUtils.stageValue(
        { production: RemovalPolicy.RETAIN },
        RemovalPolicy.DESTROY,
      ),
      encryption: props.encryption ? s3.BucketEncryption.S3_MANAGED : undefined,
    })

    const roleName = `${bucketName}-replication-role`

    const crossAccountReplicationRole = new Role(scope, roleName, {
      assumedBy: new ServicePrincipal('s3.amazonaws.com'),
      roleName: roleName,
      description: 'Role used to replicate across accounts for S3 buckets',
      path: '/',
    })

    const crossAccountReplicationRolePolicy = new PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            's3:ListBucket',
            's3:GetReplicationConfiguration',
            's3:GetObjectVersionForReplication',
            's3:GetObjectVersionAcl',
            's3:GetObjectVersionTagging',
            's3:GetObjectRetention',
            's3:GetObjectLegalHold',
          ],
          resources: [
            `arn:aws:s3:::${this.bucket.bucketName}`,
            `arn:aws:s3:::${this.bucket.bucketName}/*`,
            `arn:aws:s3:::${props.destinationBucketName}`,
            `arn:aws:s3:::${props.destinationBucketName}/*`,
          ],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            's3:ReplicateObject',
            's3:ReplicateDelete',
            's3:ReplicateTags',
            's3:ObjectOwnerOverrideToBucketOwner',
          ],
          resources: [
            `arn:aws:s3:::${this.bucket.bucketName}/*`,
            `arn:aws:s3:::${props.destinationBucketName}/*`,
          ],
        }),
      ],
    })

    const policyName = `${roleName}-policy`
    crossAccountReplicationRole.attachInlinePolicy(
      new Policy(scope, policyName, {
        policyName,
        document: crossAccountReplicationRolePolicy,
      }),
    )

    const lowLevelSourceS3Bucket = this.bucket.node.defaultChild as CfnBucket

    lowLevelSourceS3Bucket.replicationConfiguration = {
      role: crossAccountReplicationRole.roleArn,
      rules: [
        {
          id: 'CrossAccountReplicationRule',
          status: 'Enabled',
          destination: {
            bucket: `arn:aws:s3:::${props.destinationBucketName}`,
            accessControlTranslation: {
              owner: 'Destination',
            },
            account: props.destinationAccountId,
          },
          priority: 1,
          deleteMarkerReplication: {
            status: 'Disabled',
          },
          filter: {
            prefix: '',
          },
        },
      ],
    }
  }
}

export const S3EventType = s3.EventType
