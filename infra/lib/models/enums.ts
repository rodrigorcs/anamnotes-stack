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
  PRODUCTION = 'greenline-albert',
  STAGING = 'greenline-staging',
  SANDBOX = 'greenline-sandbox',
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

export enum EventTopics {
  QUERY_EXECUTION = 'queryExecution',
  INITIAL_LOAD = 'initialLoad',
}

export enum EventTypes {
  STARTED = 'started',
  SCHEDULED = 'scheduled',
}

export enum EventSources {
  BLAZE_PULSE = 'api.blaze.blaze-pulse',
}

export enum EPos {
  US = 'US',
  CA = 'CA',
}
