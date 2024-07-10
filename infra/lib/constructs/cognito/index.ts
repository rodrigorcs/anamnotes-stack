import { config } from '../../../config'
import { aws_cognito as cognito, RemovalPolicy } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { LambdaFunction } from '../lambda'

interface IUserPoolProps {
  domainPrefix: string
  name?: string
  migrationLambda?: LambdaFunction
}
export class UserPool {
  public readonly userPool: cognito.UserPool

  constructor(scope: Construct, props: IUserPoolProps) {
    const userPoolName = `${config.projectName}${props.name ? `-${props.name}` : ''}-user-pool`

    this.userPool = new cognito.UserPool(scope, userPoolName, {
      userPoolName,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        fullname: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        isAdmin: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireUppercase: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN,
      lambdaTriggers: {},
      userInvitation: {
        emailSubject: 'Anamnotes - Código de verificação',
        emailBody:
          'Bem vindo ao Anamnotes! O seu usuário é "{username}" e o código de verificação é "{####}".',
      },
      userVerification: {
        emailStyle: cognito.VerificationEmailStyle.CODE,
        emailSubject: 'Anamnotes - Código de verificação',
        emailBody: 'O seu código de verificação do Anamnotes é "{####}".',
      },
    })

    const cfnUserPool = this.userPool.node.defaultChild as cognito.CfnUserPool
    cfnUserPool.emailConfiguration = {
      emailSendingAccount: 'COGNITO_DEFAULT',
    }

    if (props.migrationLambda) {
      this.userPool.addTrigger(
        cognito.UserPoolOperation.USER_MIGRATION,
        props.migrationLambda.lambdaFn,
      )
    }

    this.userPool.addDomain(`${userPoolName}-domain`, {
      cognitoDomain: {
        domainPrefix: props.domainPrefix,
      },
    })
  }
}
