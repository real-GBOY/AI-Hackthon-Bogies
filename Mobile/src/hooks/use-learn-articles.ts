import { useEffect, useState } from 'react';

import { getLearnArticles } from '@/api';
import type { LearnArticleSummary } from '@/types/clinical';

export type LearnLoadStatus = 'loading' | 'success' | 'error';

/** GET /learn — not patient-scoped, so this is a standalone hook rather than part of PatientProfileProvider. */
export function useLearnArticles(): { articles: LearnArticleSummary[]; status: LearnLoadStatus; error: string | null } {
  const [articles, setArticles] = useState<LearnArticleSummary[]>([]);
  const [status, setStatus] = useState<LearnLoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await getLearnArticles();
        if (!cancelled) {
          setArticles(result);
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

  return { articles, status, error };
}
