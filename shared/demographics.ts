import type { Dataset } from './schema';

export const demographicLabels = { population: 'Population', under18: 'Population under 18', housing: 'Housing units' } as const;
export type DemographicMetric = Dataset['markets'][number]['demographics']['population'];
export function formatDemographic(metric: DemographicMetric): string {
  if (metric.estimate === null) return 'Unavailable';
  const estimate = metric.estimate.toLocaleString('en-US');
  if (metric.moeStatus === 'controlled') return `${estimate} · controlled estimate`;
  if (metric.marginOfError !== null) return `${estimate} ± ${metric.marginOfError.toLocaleString('en-US')}`;
  return `${estimate} · margin unavailable`;
}
