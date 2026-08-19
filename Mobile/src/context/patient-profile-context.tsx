import { createContext, useContext, type ReactNode } from 'react';

import { usePatientProfile, type ProfileLoadStatus } from '@/hooks/use-patient-profile';
import type { PatientProfile } from '@/types/clinical';

interface PatientProfileContextValue {
  profile: PatientProfile | null;
  status: ProfileLoadStatus;
  error: string | null;
}

const PatientProfileContext = createContext<PatientProfileContextValue | null>(null);

/**
 * Fetches the patient's profile content once per app session and shares it —
 * Home, Timeline, Care plan, Learn, and Ask all need pieces of the same
 * PatientProfile, so this avoids each of them independently calling
 * GET /patients/{id}/profile on mount (same rationale as PatientRiskProvider).
 */
export function PatientProfileProvider({ children }: { children: ReactNode }) {
  const { profile, status, error } = usePatientProfile();
  return <PatientProfileContext.Provider value={{ profile, status, error }}>{children}</PatientProfileContext.Provider>;
}

export function usePatientProfileContext(): PatientProfileContextValue {
  const ctx = useContext(PatientProfileContext);
  if (!ctx) throw new Error('usePatientProfileContext must be used within a PatientProfileProvider');
  return ctx;
}
