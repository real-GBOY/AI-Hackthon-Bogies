import { createContext, useContext, type ReactNode } from 'react';

import { usePatientRisk, type RiskLoadStatus } from '@/hooks/use-patient-risk';
import type { RiskResult } from '@/types/clinical';

interface PatientRiskContextValue {
  riskResult: RiskResult | null;
  status: RiskLoadStatus;
  error: string | null;
}

const PatientRiskContext = createContext<PatientRiskContextValue | null>(null);

/**
 * Fetches the patient's risk trajectory once per app session and shares it —
 * Home, My risk, and the "Why is my risk elevated?" detail screen all need
 * the same RiskResult, and without this they'd each independently call
 * GET /patients + /patients/{id}/trajectory on mount.
 */
export function PatientRiskProvider({ children }: { children: ReactNode }) {
  const { riskResult, status, error } = usePatientRisk();
  return <PatientRiskContext.Provider value={{ riskResult, status, error }}>{children}</PatientRiskContext.Provider>;
}

export function usePatientRiskContext(): PatientRiskContextValue {
  const ctx = useContext(PatientRiskContext);
  if (!ctx) throw new Error('usePatientRiskContext must be used within a PatientRiskProvider');
  return ctx;
}
