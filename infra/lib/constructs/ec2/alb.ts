import { Construct } from 'constructs'
import { aws_ec2 as ec2, aws_elasticloadbalancingv2 as elb } from 'aws-cdk-lib'
import { config } from '../../../config'

interface IAutoScalingGroupProps {
  name: string
  vpc: ec2.IVpc
  targets: elb.IApplicationLoadBalancerTarget[]
}

export class ApplicationLoadBalancer {
  public readonly loadBalancer: elb.ApplicationLoadBalancer

  constructor(scope: Construct, props: IAutoScalingGroupProps) {
    // SECURITY GROUPS
    const securityGroupName = `${config.projectName}-${props.name}-sg`
    const securityGroup = new ec2.SecurityGroup(scope, securityGroupName, {
      vpc: props.vpc,
      securityGroupName,
      allowAllOutbound: true,
    })
    securityGroup.connections.allowFromAnyIpv4(ec2.Port.allTraffic())
    securityGroup.connections.allowToAnyIpv4(ec2.Port.allTraffic())

    // LOAD BALANCER
    const elbName = `${config.projectName}-${props.name}-alb`
    this.loadBalancer = new elb.ApplicationLoadBalancer(scope, elbName, {
      loadBalancerName: elbName,
      vpc: props.vpc,
      internetFacing: true,
      securityGroup,
    })

    // LISTENERS
    const httpListener = this.loadBalancer.addListener(`${elbName}-http-listener`, {
      protocol: elb.ApplicationProtocol.HTTP,
      port: 80,
      open: true,
    })

    const targetGroupName = `${elbName}-http-listener-target-group`
    httpListener.addTargets(targetGroupName, {
      protocol: elb.ApplicationProtocol.HTTP,
      targets: props.targets,
      port: 8080,
    })
  }
}
