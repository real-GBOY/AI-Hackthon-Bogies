/**
 * Public surface of the API layer. Components/hooks should import from here
 * ("@/api") rather than reaching into config/endpoints/services directly.
 */

export { ML_SERVICE_URL, PredictionError } from './config';
export { queryRag } from './services/ragService';
export { getTrajectory, listPatients } from './services/patientService';
export type { TrajectoryFetchOptions } from './services/patientService';
export { getLearnArticle, getLearnArticles, getPatientProfile } from './services/contentService';
