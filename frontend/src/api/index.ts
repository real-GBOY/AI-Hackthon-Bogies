/**
 * Public surface of the API layer. Components/hooks should import from here
 * ("../api") rather than reaching into config/endpoints/services directly.
 */

export { PredictionError } from "./config";
export { predict, checkHealth } from "./services/predictionService";
export { queryRag } from "./services/ragService";
export { listPatients, getTrajectory } from "./services/patientService";
export type { TrajectoryFetchOptions } from "./services/patientService";
