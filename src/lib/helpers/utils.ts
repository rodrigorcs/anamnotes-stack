import { Dayjs } from 'dayjs'

export const calculateIntervalsQty = (
  startTimestamp: Dayjs,
  endTimestamp: Dayjs,
  intervalInDays: number,
): number => {
  const diffInDays = startTimestamp.diff(endTimestamp, 'day')
  const intervals = Math.ceil(Math.abs(diffInDays) / intervalInDays)

  return intervals
}
