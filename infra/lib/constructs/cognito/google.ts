import { config } from '../../../config'
import { aws_cognito as cognito } from 'aws-cdk-lib'
import { Construct } from 'constructs'

interface IGoogleIdentityProviderProps {
  userPool: cognito.UserPool
  clientCredentials: {
    id: string
    secret: string
  }
}
export class GoogleIdentityProvider {
  public readonly googleIdP: cognito.UserPoolIdentityProviderGoogle

  constructor(scope: Construct, props: IGoogleIdentityProviderProps) {
    const googleIdPName = `${config.projectName}-google-idp`

    this.googleIdP = new cognito.UserPoolIdentityProviderGoogle(scope, googleIdPName, {
      userPool: props.userPool,
      clientId: props.clientCredentials.id,
      clientSecret: props.clientCredentials.secret,
      scopes: [
        cognito.OAuthScope.EMAIL.scopeName,
        cognito.OAuthScope.OPENID.scopeName,
        cognito.OAuthScope.PROFILE.scopeName,
      ],
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        fullname: cognito.ProviderAttribute.GOOGLE_NAME,
      },
    })
  }
}
