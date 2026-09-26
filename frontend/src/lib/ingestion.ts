import { apiClient } from './api';
import type { JobSource } from './jobs';

export interface IngestionParams {
  query: string;
  location?: string;
  limit?: number;
  sources?: JobSource[];
}

export interface IngestionSourceResult {
  source: JobSource;
  fetched: number;
  created: number;
  skipped: number;
  failed: number;
}

export interface IngestionResult {
  summary: { fetched: number; created: number; skipped: number; failed: number };
  results: IngestionSourceResult[];
}

/** POST /ingestion/run */
export async function runIngestion(params: IngestionParams): Promise<IngestionResult> {
  const res = await apiClient.post<{ success: boolean } & IngestionResult>(
    '/ingestion/run',
    params
  );
  return { summary: res.data.summary, results: res.data.results };
}
