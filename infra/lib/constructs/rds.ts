import { Construct } from 'constructs'
import { aws_rds as rds, aws_ec2 as ec2 } from 'aws-cdk-lib'
import { config } from '../../config'
import { getSecretValue } from '../utils'
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager'

interface IExistingRDSInstanceProps {
  instanceCredentialsSecret: ISecret
  securityGroupNames: string[]
  vpc: ec2.IVpc
}

export class ExistingRDSInstance {
  public readonly rdsInstance: rds.IDatabaseInstance
  public readonly outboundSecurityGroup?: ec2.ISecurityGroup
  private securityGroups: ec2.ISecurityGroup[]

  constructor(scope: Construct, props: IExistingRDSInstanceProps) {
    const instanceId = `${config.projectName}-existing-rds-instance`

    this.securityGroups = props.securityGroupNames.map((sgName) => {
      return ec2.SecurityGroup.fromLookupByName(
        scope,
        `${config.projectName}-${sgName}-sg`,
        sgName,
        props.vpc,
      )
    })

    this.rdsInstance = rds.DatabaseInstance.fromDatabaseInstanceAttributes(scope, instanceId, {
      instanceIdentifier: getSecretValue(props.instanceCredentialsSecret, 'dbInstanceIdentifier'),
      instanceEndpointAddress: getSecretValue(props.instanceCredentialsSecret, 'host'),
      port: parseInt(getSecretValue(props.instanceCredentialsSecret, 'port')),
      securityGroups: this.securityGroups,
    })
  }
}
