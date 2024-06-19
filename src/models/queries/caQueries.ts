import { Dayjs } from 'dayjs'

const getAthenaTimestamp = (timestamp: Dayjs) => timestamp.format('YYYY-MM-DD HH:mm:ss')

export const getCAMetricsQuery = ({
  companyIds,
  date,
}: {
  companyIds: string[]
  date: Dayjs
}): string | null => {
  const startTimestamp = getAthenaTimestamp(date)
  const endTimestamp = getAthenaTimestamp(date.add(1, 'day'))
  const companyIdsStr = companyIds.map((id) => `'${id}'`).join(',')
  return /*sql*/ `
    SELECT CAST(c.id AS VARCHAR) AS company_id,
      COALESCE(COUNT(p.id), 0) AS payments_count,
      COALESCE(SUM(p.total), 0) AS payments_totals_sum
    FROM companies AS c
      LEFT JOIN payments_transformed p ON CAST(c.id AS VARCHAR) = p.companyid
        AND p.completedate >= TIMESTAMP '${startTimestamp}'
        AND p.completedate < TIMESTAMP '${endTimestamp}'
        AND p.status = 'completed'
    WHERE CAST(c.id AS VARCHAR) IN (${companyIdsStr})
    GROUP BY CAST(c.id AS VARCHAR)
    ORDER BY CAST(c.id AS VARCHAR);
  `
}
