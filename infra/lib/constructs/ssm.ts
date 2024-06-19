import { Construct } from 'constructs'
import { aws_ssm as ssm } from 'aws-cdk-lib'
import { config } from '../../config'

interface IExistingStringSystemParameterInput {
  path: string
  fetchInSynthesisTime?: boolean
}

export class ExistingStringSystemParameter {
  public readonly parameter: ssm.IStringParameter
  public readonly value: string

  constructor(scope: Construct, props: IExistingStringSystemParameterInput) {
    this.parameter = ssm.StringParameter.fromStringParameterAttributes(
      scope,
      `${config.projectName}-${props.path.replace(/\//g, '-')}-system-parameter`,
      {
        parameterName: props.path,
      },
    )

    if (props.fetchInSynthesisTime) {
      // Use with caution: https://docs.aws.amazon.com/cdk/v2/guide/get_ssm_value.html#ssm_read_at_synth
      this.value = ssm.StringParameter.valueFromLookup(scope, props.path)
    } else {
      this.value = this.parameter.stringValue
    }
  }
}
