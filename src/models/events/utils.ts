import dayjs from 'dayjs'

type EnumAsObject = Record<string | number, string>

export enum EQueryExecutionEventTopics {
  QUERY_EXECUTION = 'queryExecution',
  INITIAL_LOAD = 'initialLoad',
  ADD_METADATA = 'addMetadata',
}

export enum EQueryExecutionEventTypes {
  STARTED = 'started',
  SCHEDULED = 'scheduled',
}

export enum EEventSources {
  BLAZE_PULSE = 'api.blaze.blaze-pulse',
}

export const isTimestampValid = (timestampStr: string): boolean => {
  return dayjs(timestampStr).isValid()
}

export const isEventDetailTypeValid = (
  detailType: string,
  eventTopics: EnumAsObject,
  eventTypes: EnumAsObject,
): boolean => {
  const [eventTopic, eventType] = detailType.split('.')
  const isEventTopicValid = Object.values(eventTopics).includes(eventTopic)
  const isEventTypeValid = Object.values(eventTypes).includes(eventType)

  return isEventTopicValid && isEventTypeValid
}

export const convertStringToBoolean = (value: 'true' | 'false'): boolean => value === 'true'
