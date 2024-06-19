export enum GithubBranch {
  SANDBOX = 'sandbox',
  STAGING = 'staging',
  PRODUCTION = 'main',
}

export enum AppStage {
  SANDBOX = 'sandbox',
  STAGING = 'staging',
  PRODUCTION = 'prod',
  LOCAL = 'local',
}

export enum AppStageProfiles {
  PRODUCTION = 'prod',
  STAGING = 'staging',
  SANDBOX = 'personal-iam',
}

export enum DeploymentEnvironments {
  LOCAL = 'local',
  CI = 'CI',
}

export enum HttpMethods {
  OPTIONS = 'OPTIONS',
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export enum LambdaMetricActions {
  SUCCEEDED = 'succeeded',
  ERRORED = 'errored',
  FAULTED = 'faulted',
  THROTTLED = 'throttled',
}
