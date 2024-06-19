import { aws_athena as athena, aws_iam as iam } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { config } from '../../config'

interface IAthenaWorkgroupProps {
  workgroupName: string
  outputBucketName: string
  glueDatabaseName?: string
}

export class AthenaWorkgroup {
  public readonly workgroup: athena.CfnWorkGroup
  private scope: Construct
  private workgroupId: string
  private glueDatabaseName?: string

  constructor(scope: Construct, props: IAthenaWorkgroupProps) {
    this.scope = scope
    this.workgroupId = `${config.projectName}-${props.workgroupName}-workgroup`
    this.glueDatabaseName = props.glueDatabaseName

    const athenaWorkgroup = new athena.CfnWorkGroup(scope, this.workgroupId, {
      name: this.workgroupId,
      description: `Athena workgroup used for ${config.projectName}`,
      workGroupConfiguration: {
        resultConfiguration: {
          outputLocation: `s3://${props.outputBucketName}/`,
        },
        enforceWorkGroupConfiguration: false,
      },
    })

    this.workgroup = athenaWorkgroup
  }

  public grantQueryExecution(grantee: iam.IGrantable) {
    const { AWS_DEFAULT_REGION: REGION, CDK_DEFAULT_ACCOUNT: ACCOUNT } = config.validatedEnvs

    if (!this.glueDatabaseName)
      throw new Error('glueDatabaseName is required for grantQueryExecution')

    iam.Grant.addToPrincipal({
      scope: this.scope,
      grantee,
      actions: ['athena:StartQueryExecution', 'athena:StopQueryExecution'],
      resourceArns: [`arn:aws:athena:${REGION}:${ACCOUNT}:workgroup/${this.workgroupId}`],
    })

    iam.Grant.addToPrincipal({
      scope: this.scope,
      grantee,
      actions: ['glue:GetDatabase', 'glue:GetTable'],
      resourceArns: [
        `arn:aws:glue:${REGION}:${ACCOUNT}:catalog`,
        `arn:aws:glue:${REGION}:${ACCOUNT}:database/${this.glueDatabaseName}`,
        `arn:aws:glue:${REGION}:${ACCOUNT}:table/${this.glueDatabaseName}/*`,
      ],
    })
  }

  public grantReadExecution(grantee: iam.IGrantable) {
    const { AWS_DEFAULT_REGION: REGION, CDK_DEFAULT_ACCOUNT: ACCOUNT } = config.validatedEnvs

    iam.Grant.addToPrincipal({
      scope: this.scope,
      grantee,
      actions: ['athena:GetQueryExecution'],
      resourceArns: [`arn:aws:athena:${REGION}:${ACCOUNT}:workgroup/${this.workgroupId}`],
    })
  }
}

interface IAthenaLambdaDataCatalogProps {
  dataCatalogName: string
  lambdaArn: string
  description?: string
}

export class AthenaLambdaDataCatalog {
  public dataCatalog: athena.CfnDataCatalog

  constructor(scope: Construct, props: IAthenaLambdaDataCatalogProps) {
    const catalogName = `${config.projectName}-${props.dataCatalogName}-catalog`

    this.dataCatalog = new athena.CfnDataCatalog(scope, catalogName, {
      name: catalogName,
      type: 'LAMBDA',
      parameters: {
        function: props.lambdaArn,
      },
      description: props.description,
    })
  }
}
