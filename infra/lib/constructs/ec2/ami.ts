import { Construct } from 'constructs'
import { aws_ec2 as ec2 } from 'aws-cdk-lib'

interface IExistingMachineImageProps {
  name: string
}

export class ExistingMachineImage {
  public readonly machineImage: ec2.IMachineImage

  constructor(scope: Construct, props: IExistingMachineImageProps) {
    this.machineImage = ec2.MachineImage.lookup({
      name: props.name,
    })
  }
}
