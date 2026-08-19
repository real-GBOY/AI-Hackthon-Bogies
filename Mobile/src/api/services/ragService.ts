import type { RagMode, RagQueryResponse } from '@/types/clinical';

import { PredictionError } from '../config';
import { fetchRagQuery } from '../endpoints/rag';
import { isRagQueryResponse } from '../guards';

/**
 * Queries the live guideline RAG assistant. Throws PredictionError on any
 * failure so callers (the Ask screen) can show a "couldn't reach the
 * assistant" state rather than crash.
 */
export async function queryRag(question: string, mode: RagMode): Promise<RagQueryResponse> {
  const response = await fetchRagQuery(question, mode);

  if (!response.ok) {
    throw new PredictionError(`RAG query failed: ${response.status} ${response.statusText}`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new PredictionError('RAG response was not valid JSON', error);
  }

  if (!isRagQueryResponse(body)) {
    throw new PredictionError('RAG response did not match the expected shape');
  }

  return body;
}
