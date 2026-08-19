import { fetchWithTimeout } from '../config';

/** GET /patients/{id}/profile — non-scoring content (ml/content_routes.py). */
export function fetchPatientProfile(patientId: string): Promise<Response> {
  return fetchWithTimeout(`/patients/${encodeURIComponent(patientId)}/profile`);
}

/** GET /learn — the full list of learn articles. */
export function fetchLearnArticles(): Promise<Response> {
  return fetchWithTimeout('/learn');
}

/** GET /learn/{slug} — one article's full detail, including its body if authored. */
export function fetchLearnArticle(slug: string): Promise<Response> {
  return fetchWithTimeout(`/learn/${encodeURIComponent(slug)}`);
}
