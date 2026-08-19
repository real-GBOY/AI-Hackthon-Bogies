export type HdpView = "dashboard" | "patients" | "patient" | "queue" | "guides" | "alerts" | "settings" | "ai";

export const VIEW_TITLE: Record<HdpView, string> = {
  dashboard: "Dashboard",
  patients: "Patients",
  patient: "Patient",
  queue: "Review queue",
  guides: "Guidelines library",
  alerts: "Alerts",
  settings: "Model & settings",
  ai: "Ask AI",
};
