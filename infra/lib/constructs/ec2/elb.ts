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
    // LOAD BALANCER
    const elbName = `${config.projectName}-${props.name}-load-balancer`
    this.loadBalancer = new elb.ApplicationLoadBalancer(scope, elbName, {
      loadBalancerName: elbName,
      vpc: props.vpc,
      internetFacing: true,
    })

    // LISTENERS
    const httpListener = this.loadBalancer.addListener(`${elbName}-http-listener`, {
      protocol: elb.ApplicationProtocol.HTTP,
    })

    httpListener.addTargets(`${elbName}-http-listener-targets`, {
      protocol: elb.ApplicationProtocol.HTTP,
      targets: props.targets,
    })
  }
}
