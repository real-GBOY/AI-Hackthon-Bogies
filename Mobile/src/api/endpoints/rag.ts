import type { RagMode } from '@/types/clinical';

import { fetchWithTimeout, RAG_TIMEOUT_MS } from '../config';

/** POST /rag/query — the live guideline RAG assistant (ml/rag_routes.py), wrapping rag.py + generate.py. */
export function fetchRagQuery(question: string, mode: RagMode): Promise<Response> {
  return fetchWithTimeout(
    '/rag/query',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, mode }),
    },
    RAG_TIMEOUT_MS,
  );
}
