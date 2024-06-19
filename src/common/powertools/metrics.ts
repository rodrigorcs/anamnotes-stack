import { Metrics, MetricUnits } from '@aws-lambda-powertools/metrics'
import { config } from '../../config'

export enum EMetricNames {
  DUMPED_FILES_COUNT = 'DumpedFilesCount',
  DUMPED_ROWS_COUNT = 'DumpedRowsCount',
  DUMPED_FILE_SIZE = 'DumpedFileSize',
  DUMPED_TRANSACTIONS_COUNT = 'DumpedTransactionsCount',
  DUMPED_DUPLICATE_IDS_COUNT = 'DumpedDuplicateIdsCount',
}

export enum EMetricDimensions {
  PARTNER = 'partner',
}

export enum EMetricMetadataKeys {
  QUERY_EXECUTION_ID = 'queryExecutionId',
}

export { MetricUnits }

export const metrics = new Metrics({
  namespace: config.serviceName,
  serviceName: config.serviceName,
})
