export interface IPrecomputedSeries {
  id: string
  label: string
  description: string
  data: number[]
}

export interface IPrecomputedMetrics {
  xAxis: (string | number)[]
  series: IPrecomputedSeries[]
}
