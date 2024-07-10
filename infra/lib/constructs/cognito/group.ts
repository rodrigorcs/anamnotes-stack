import { Construct } from 'constructs'
import { config } from '../../../config'
import { aws_cognito as cognito } from 'aws-cdk-lib'

export class UserPoolGroup {
  public readonly userPoolGroup: cognito.CfnUserPoolGroup

  constructor(scope: Construct, props: cognito.CfnUserPoolGroupProps) {
    this.userPoolGroup = new cognito.CfnUserPoolGroup(
      scope,
      `${config.projectName}-user-pool-group`,
      props,
    )
  }
}
