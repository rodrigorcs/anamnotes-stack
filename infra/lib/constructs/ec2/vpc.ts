import { aws_ec2 as ec2 } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { config } from '../../../config'

interface IExistingVPCProps {
  vpcName?: string
  accountId?: string
  vpcId?: string
  allowAllOutbound?: boolean
}

export class ExistingVPC extends Construct {
  public readonly vpc: ec2.IVpc
  public readonly outboundSecurityGroup?: ec2.ISecurityGroup

  constructor(scope: Construct, props: IExistingVPCProps) {
    const cdkId = `${config.projectName}-${props.vpcName}-existing-vpc`
    super(scope, cdkId)

    this.vpc = ec2.Vpc.fromLookup(this, cdkId, {
      vpcName: props.vpcName,
      ownerAccountId: props.accountId,
      vpcId: props.vpcId,
      isDefault: false,
    })

    if (props.allowAllOutbound) {
      const outboundSecurityGroupName = `${config.projectName}-${this.vpc.vpcId}-allow-all-outbound-sg`
      this.outboundSecurityGroup = new ec2.SecurityGroup(scope, outboundSecurityGroupName, {
        vpc: this.vpc,
        allowAllOutbound: true,
        securityGroupName: outboundSecurityGroupName,
      })
    }
  }
}
