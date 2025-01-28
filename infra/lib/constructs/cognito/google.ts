import { config } from '../../../config'
import { aws_cognito as cognito } from 'aws-cdk-lib'
import { Construct } from 'constructs'

interface IGoogleIdentityProviderProps {
  userPool: cognito.UserPool
}
export class GoogleIdentityProvider {
  public readonly googleIdP: cognito.UserPoolIdentityProviderGoogle

  constructor(scope: Construct, props: IGoogleIdentityProviderProps) {
    const googleIdPName = `${config.projectName}-google-idp`

    this.googleIdP = new cognito.UserPoolIdentityProviderGoogle(scope, googleIdPName, {
      userPool: props.userPool,
      clientId: config.aws.cognito.googleIdP.clientId,
      clientSecret: config.aws.cognito.googleIdP.clientSecret,
      scopes: ['email', 'profile'],
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        fullname: cognito.ProviderAttribute.GOOGLE_NAME,
      },
    })
  }
}
