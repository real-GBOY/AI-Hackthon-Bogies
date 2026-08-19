import { useEffect, useState } from 'react';

import { getTrajectory, listPatients, PredictionError } from '@/api';
import type { RiskResult } from '@/types/clinical';

export type RiskLoadStatus = 'loading' | 'success' | 'error';

/**
 * Loads the first seeded patient's live trajectory on mount. No mock
 * fallback — if the backend is unreachable, status is 'error' and callers
 * render an explicit error state rather than silently showing fake data.
 */
export function usePatientRisk(): { riskResult: RiskResult | null; status: RiskLoadStatus; error: string | null } {
  const [riskResult, setRiskResult] = useState<RiskResult | null>(null);
  const [status, setStatus] = useState<RiskLoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const ids = await listPatients();
        if (ids.length === 0) throw new PredictionError('No patients available');
        const trajectory = await getTrajectory(ids[0]);
        if (!cancelled) {
          setRiskResult(trajectory);
          setStatus('success');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Could not reach the ML service');
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { riskResult, status, error };
}
