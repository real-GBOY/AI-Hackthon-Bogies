import { useCallback, useState } from 'react';

import { PredictionError, queryRag } from '@/api';
import type { RagMode, RagQueryResponse } from '@/types/clinical';

export type RagQueryStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Shared submit/status/result state for anything that asks the RAG assistant
 * a question (the Ask screen). `ask` both updates the hook's own state (for
 * callers that just render `status`/`data`/`error` reactively) and resolves
 * with the response directly, so a caller that needs to branch on the result
 * of *this* call (e.g. checking `escalation_flag` right after submitting)
 * doesn't have to read back a stale closure over `data`.
 */
export function useRagQuery(): {
  status: RagQueryStatus;
  data: RagQueryResponse | null;
  error: string | null;
  ask: (question: string, mode: RagMode) => Promise<RagQueryResponse | null>;
  reset: () => void;
} {
  const [status, setStatus] = useState<RagQueryStatus>('idle');
  const [data, setData] = useState<RagQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (question: string, mode: RagMode) => {
    setStatus('loading');
    setError(null);
    try {
      const response = await queryRag(question, mode);
      setData(response);
      setStatus('success');
      return response;
    } catch (err) {
      const message = err instanceof PredictionError ? err.message : 'Unexpected error';
      setStatus('error');
      setError(message);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setData(null);
    setError(null);
  }, []);

  return { status, data, error, ask, reset };
}
