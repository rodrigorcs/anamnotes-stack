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
}

export class AutoScalingGroup {
  public readonly group: autoscaling.AutoScalingGroup

  constructor(scope: Construct, props: IAutoScalingGroupProps) {
    const groupName = `${config.projectName}-${props.name}-group`
    this.group = new autoscaling.AutoScalingGroup(scope, groupName, {
      autoScalingGroupName: groupName,
      vpc: props.vpc,
      instanceType: new ec2.InstanceType(props.instanceType),
      maxCapacity: props.maxCapacity,
      minCapacity: props.minCapacity,
      machineImage: props.machineImage,
      allowAllOutbound: true,
    })
  }
}
