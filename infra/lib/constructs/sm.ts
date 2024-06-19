import { Construct } from 'constructs'
import { aws_secretsmanager as secrets } from 'aws-cdk-lib'

interface IExistingSecretProps {
  secretName: string
}

export class ExistingSecret {
  public readonly secret: secrets.ISecret

  constructor(scope: Construct, props: IExistingSecretProps) {
    this.secret = secrets.Secret.fromSecretNameV2(
      scope,
      `${props.secretName.replace(/\//g, '-')}-secrets`,
      props.secretName,
    )
  }
}
