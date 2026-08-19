import type { LearnArticleDetail, LearnArticleSummary, PatientProfile } from '@/types/clinical';

import { PredictionError } from '../config';
import { fetchLearnArticle, fetchLearnArticles, fetchPatientProfile } from '../endpoints/content';
import { isLearnArticleDetail, isLearnArticleSummaryList, isPatientProfile } from '../guards';

export async function getPatientProfile(patientId: string): Promise<PatientProfile> {
  const response = await fetchPatientProfile(patientId);
  if (!response.ok) {
    throw new PredictionError(`Profile request failed: ${response.status} ${response.statusText}`);
  }
  const body = await response.json();
  if (!isPatientProfile(body)) {
    throw new PredictionError('Profile response did not match the expected PatientProfile shape');
  }
  return body;
}

export async function getLearnArticles(): Promise<LearnArticleSummary[]> {
  const response = await fetchLearnArticles();
  if (!response.ok) {
    throw new PredictionError(`Learn list request failed: ${response.status} ${response.statusText}`);
  }
  const body = await response.json();
  if (!isLearnArticleSummaryList(body)) {
    throw new PredictionError('Learn list response did not match the expected shape');
  }
  return body;
}

export async function getLearnArticle(slug: string): Promise<LearnArticleDetail> {
  const response = await fetchLearnArticle(slug);
  if (!response.ok) {
    throw new PredictionError(`Learn article request failed: ${response.status} ${response.statusText}`);
  }
  const body = await response.json();
  if (!isLearnArticleDetail(body)) {
    throw new PredictionError('Learn article response did not match the expected shape');
  }
  return body;
}
