import { useEffect, useState } from 'react';

import { getPatientProfile, listPatients, PredictionError } from '@/api';
import type { PatientProfile } from '@/types/clinical';

export type ProfileLoadStatus = 'loading' | 'success' | 'error';

/**
 * Loads the first seeded patient's profile content (name, timeline, care
 * plan, learn suggestions, etc. — see ml/content_routes.py) on mount. No
 * mock fallback — same contract as usePatientRisk.
 */
export function usePatientProfile(): { profile: PatientProfile | null; status: ProfileLoadStatus; error: string | null } {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [status, setStatus] = useState<ProfileLoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const ids = await listPatients();
        if (ids.length === 0) throw new PredictionError('No patients available');
        const result = await getPatientProfile(ids[0]);
        if (!cancelled) {
          setProfile(result);
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

  return { profile, status, error };
}
