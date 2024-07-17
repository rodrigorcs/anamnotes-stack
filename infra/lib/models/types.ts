import { AppStage, AppStageProfiles } from './enums'

export type REQUIRED_ENV_VARIABLES = {
  CDK_DEFAULT_ACCOUNT: string
  AWS_DEFAULT_REGION: string
  /**
   * The user or process that deployed the IaC
   */
  DEPLOYED_BY: string
  /**
   *  The stage to deploy as e.g. prod, staging
   */
  STAGE: AppStage
}

export type OPTIONAL_ENV_VARIABLES = {
  LOCAL_AWS_ENDPOINT: string
  DATABASE_URL: string
}

// export type OPTIONAL_ENV_VARIABLES = {}

export type requiredIndexSignature = {
  [k in keyof REQUIRED_ENV_VARIABLES]: string
}

export type optionalIndexSignature = {
  [k in keyof OPTIONAL_ENV_VARIABLES]?: string
}

export type ENV_VARIABLES = requiredIndexSignature & optionalIndexSignature

export type SetAppStageProfile = {
  [key: string]: AppStageProfiles
}
