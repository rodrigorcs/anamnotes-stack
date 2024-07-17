export enum GithubBranch {
  STAGING = 'staging',
  PRODUCTION = 'main',
}

export enum AppStage {
  STAGING = 'staging',
  PRODUCTION = 'prod',
  LOCAL = 'local',
}

export enum AppStageProfiles {
  PRODUCTION = 'prod',
  STAGING = 'staging',
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
