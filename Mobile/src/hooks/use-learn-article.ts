import { useEffect, useState } from 'react';

import { getLearnArticle } from '@/api';
import type { LearnArticleDetail } from '@/types/clinical';

export type LearnArticleLoadStatus = 'loading' | 'success' | 'error' | 'not-found';

/** GET /learn/{slug} — one article's full detail. */
export function useLearnArticle(slug: string | undefined): {
  article: LearnArticleDetail | null;
  status: LearnArticleLoadStatus;
} {
  const [article, setArticle] = useState<LearnArticleDetail | null>(null);
  const [status, setStatus] = useState<LearnArticleLoadStatus>(slug ? 'loading' : 'not-found');

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    async function load() {
      setStatus('loading');
      try {
        const result = await getLearnArticle(slug as string);
        if (!cancelled) {
          setArticle(result);
          setStatus('success');
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '';
        setStatus(message.includes('404') ? 'not-found' : 'error');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { article, status };
}
