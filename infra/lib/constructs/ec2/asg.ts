import { Construct } from 'constructs'
import { aws_ec2 as ec2, aws_autoscaling as autoscaling } from 'aws-cdk-lib'
import { config } from '../../../config'

interface IAutoScalingGroupProps {
  name: string
  vpc: ec2.IVpc
  instanceType: string
  maxCapacity?: number
  minCapacity?: number
  machineImage?: ec2.IMachineImage
  keyPairName?: string
  commandsOnBoot?: string[]
}

export class AutoScalingGroup {
  public readonly group: autoscaling.AutoScalingGroup

  constructor(scope: Construct, props: IAutoScalingGroupProps) {
    const asgName = `${config.projectName}-${props.name}-group`

    // SECURITY GROUPS
    const securityGroupName = `${config.projectName}-${props.name}-sg`
    const securityGroup = new ec2.SecurityGroup(scope, securityGroupName, {
      vpc: props.vpc,
      securityGroupName,
      allowAllOutbound: true,
    })
    securityGroup.connections.allowFromAnyIpv4(ec2.Port.allTraffic())
    securityGroup.connections.allowToAnyIpv4(ec2.Port.allTraffic())

    const keyPair = props.keyPairName
      ? ec2.KeyPair.fromKeyPairName(scope, `${asgName}-key-pair`, props.keyPairName)
      : undefined

    this.group = new autoscaling.AutoScalingGroup(scope, asgName, {
      autoScalingGroupName: asgName,
      vpc: props.vpc,
      instanceType: new ec2.InstanceType(props.instanceType),
      maxCapacity: props.maxCapacity,
      minCapacity: props.minCapacity,
      machineImage: props.machineImage,
      allowAllOutbound: true,
      keyPair,
      securityGroup,
    })

    if (props.commandsOnBoot) this.group.addUserData(...props.commandsOnBoot)
  }
}
