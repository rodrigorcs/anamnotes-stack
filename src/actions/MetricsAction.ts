import { QueryExecutionsService } from '../services/QueryExecutionsService'
import { logger } from '../common/powertools/logger'
import { CAMonolithService } from '../services/CAMonolithService'
import { EMetricMetadataKeys, metrics } from '../common/powertools/metrics'
import { Dayjs } from 'dayjs'
import { IQueryExecution } from '../models/contracts/QueryExecution'
import { IPrecomputedMetrics } from '../models/contracts/PrecomputedMetrics'

export class MetricsAction {
  private queryExecutionsService: QueryExecutionsService
  private monolithService?: CAMonolithService

  constructor() {
    this.monolithService = new CAMonolithService()
    this.queryExecutionsService = new QueryExecutionsService()
  }

  public getMetricsFromMonolith = async ({
    date,
    companyIds,
  }: {
    date: Dayjs
    companyIds: string[]
  }) => {
    if (!this.monolithService) throw new Error('MonolithService not initialized')

    logger.info('Getting metrics for POS', {
      date,
      companyIds,
    })

    const { queryExecutionId } = await this.monolithService.getMetrics({
      date,
      companyIds,
    })
    metrics.addMetadata(EMetricMetadataKeys.QUERY_EXECUTION_ID, queryExecutionId)
  }

  public saveMetrics = async (queryExecutions: IQueryExecution[]) => {
    logger.info('Saving metrics for POS')

    await this.queryExecutionsService.bulkCreate(queryExecutions)
  }

  public getPrecomputedMetrics = async ({
    date,
    merchantId,
  }: {
    date: Dayjs
    merchantId: string
  }): Promise<IPrecomputedMetrics> => {
    const queryExecutions = await this.queryExecutionsService.get({
      date: date.subtract(1, 'month'),
      merchantId,
    })

    const paymentsCountSeriesData: number[] = []
    const paymentsTotalSumSeriesData: number[] = []

    queryExecutions.forEach((queryExecution) => {
      paymentsCountSeriesData.push(queryExecution.paymentsCount)
      paymentsTotalSumSeriesData.push(queryExecution.paymentsTotalSum)
    })

    return {
      xAxis: queryExecutions.map((queryExecution) => queryExecution.date.toISOString()),
      series: [
        {
          id: 'paymentsCount',
          label: 'Visits',
          description: 'The total amount of sales made',
          data: paymentsCountSeriesData,
        },
        {
          id: 'paymentsTotalSum',
          label: 'Sales Totals',
          description: 'The sum of sales total values, after discounts and taxes',
          data: paymentsTotalSumSeriesData,
        },
      ],
    }
  }
}
