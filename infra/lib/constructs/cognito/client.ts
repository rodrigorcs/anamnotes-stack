import { aws_cognito as cognito, Duration } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { config } from '../../../config'

interface IUserPoolClientProps extends cognito.UserPoolClientProps {}

export class UserPoolClient {
  public readonly userPoolClient: cognito.UserPoolClient

  constructor(scope: Construct, props: IUserPoolClientProps) {
    const userPoolClientName = `${config.projectName}-user-pool-client`
    const standardCognitoAttributes: cognito.StandardAttributesMask = {
      fullname: true,
      email: true,
      emailVerified: true,
    }

    // Granting permissions for readable fields on cognito
    const clientReadAttributes = new cognito.ClientAttributes()
      .withStandardAttributes(standardCognitoAttributes)
      .withCustomAttributes(...['isAdmin'])

    // Granting permissions for writeable fields on cognito
    const clientWriteAttributes = new cognito.ClientAttributes().withStandardAttributes({
      ...standardCognitoAttributes,
      emailVerified: false,
    })

    this.userPoolClient = new cognito.UserPoolClient(scope, userPoolClientName, {
      authFlows: {
        userSrp: true,
        userPassword: true,
      },
      generateSecret: false,
      oAuth: {
        callbackUrls: [config.aws.cognito.callbackURL],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
        cognito.UserPoolClientIdentityProvider.GOOGLE,
        // cognito.UserPoolClientIdentityProvider.FACEBOOK,
        // cognito.UserPoolClientIdentityProvider.APPLE,
      ],
      readAttributes: clientReadAttributes,
      writeAttributes: clientWriteAttributes,
      accessTokenValidity: Duration.minutes(60),
      idTokenValidity: Duration.minutes(60),
      refreshTokenValidity: Duration.days(90),
      ...props,
    })
  }
}
