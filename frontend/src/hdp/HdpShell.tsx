import type { CSSProperties, ReactNode } from "react";
import type { HdpView } from "./types";
import { VIEW_TITLE } from "./types";
import type { PatientSource } from "../hooks/useLivePatients";
import type { ClinicianOut } from "../types";
import { cssVars, neutral, positiveText, riskText } from "./colors";
import "./HdpShell.css";

interface NavItem {
  key: HdpView;
  label: string;
  badge?: number;
}

const CLINICAL: NavItem[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "patients", label: "Patients" },
  { key: "queue", label: "Review queue" },
  { key: "ai", label: "Ask AI" },
];

const SYSTEM: NavItem[] = [
  { key: "alerts", label: "Alerts" },
  { key: "guides", label: "Guidelines" },
  { key: "settings", label: "Model & settings" },
];

interface HdpShellProps {
  view: HdpView;
  onNavigate: (view: HdpView) => void;
  alertCount: number;
  panelSize: number;
  query: string;
  onQueryChange: (value: string) => void;
  onNewAssessment: () => void;
  onOpenPatientMode: () => void;
  onOpenJourneyDemo: () => void;
  breadcrumbOverride?: string;
  dataSource: PatientSource;
  clinician: ClinicianOut | null;
  children: ReactNode;
}

export function HdpShell({
  view,
  onNavigate,
  alertCount,
  panelSize,
  query,
  onQueryChange,
  onNewAssessment,
  onOpenPatientMode,
  onOpenJourneyDemo,
  breadcrumbOverride,
  dataSource,
  clinician,
  children,
}: HdpShellProps) {
  const navButton = (item: NavItem) => (
    <button
      key={item.key}
      className={`hdp__nav-item${view === item.key ? " hdp__nav-item--active" : ""}`}
      onClick={() => onNavigate(item.key)}
    >
      <span className="hdp__nav-icon" />
      <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
      {typeof item.badge === "number" && item.badge > 0 && <span className="hdp__nav-badge">{item.badge}</span>}
    </button>
  );

  return (
    <div className="hdp" style={cssVars as CSSProperties}>
      <aside className="hdp__sidebar">
        <div className="hdp__brand">
          <div className="hdp__brand-mark">H</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div className="hdp__brand-name">HDP Intelligence</div>
            <div className="hdp__brand-sub">MERCY WOMEN'S HEALTH</div>
          </div>
        </div>

        <nav className="hdp__nav">
          <div className="hdp__nav-label">CLINICAL</div>
          {CLINICAL.map((item) => navButton(item.key === "alerts" ? { ...item, badge: alertCount } : item))}

          <div className="hdp__nav-label">PATIENT EXPERIENCE</div>
          <button className="hdp__nav-item" onClick={onOpenPatientMode}>
            <span className="hdp__nav-icon" />
            <span style={{ flex: 1, textAlign: "left" }}>Patient app preview</span>
          </button>
          <button className="hdp__nav-item" onClick={onOpenJourneyDemo}>
            <span className="hdp__nav-icon" />
            <span style={{ flex: 1, textAlign: "left" }}>Journey demo</span>
          </button>

          <div className="hdp__nav-label">SYSTEM</div>
          {SYSTEM.map((item) => navButton(item.key === "alerts" ? { ...item, badge: alertCount } : item))}
        </nav>

        <div className="hdp__profile">
          <div className="hdp__profile-avatar">
            {clinician
              ? clinician.name
                  .replace(/^(Dr|Mr|Mrs|Ms)\.?\s+/i, "")
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "…"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <div className="hdp__profile-name">{clinician?.name ?? "Loading…"}</div>
            <div className="hdp__profile-meta">
              {clinician ? `${clinician.role} · Panel of ${panelSize}` : `Panel of ${panelSize}`}
            </div>
          </div>
        </div>
      </aside>

      <main className="hdp__main">
        <header className="hdp__header">
          <div className="hdp__breadcrumb">
            <span>Mercy Women's Health</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span className="hdp__breadcrumb-current">{breadcrumbOverride ?? VIEW_TITLE[view]}</span>
            {dataSource !== "loading" && (
              <span style={{ fontSize: 11, color: dataSource === "live" ? positiveText : riskText("high") }}>
                · {dataSource === "live" ? "live backend" : "backend unreachable"}
              </span>
            )}
          </div>
          <div style={{ flex: 1 }} />
          <div className="hdp__search">
            <span className="hdp__search-ring" />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search patients, MRN, or ask a question"
            />
            <span className="mono" style={{ fontSize: 10, color: neutral.slateFaint, border: `1px solid ${neutral.border}`, borderRadius: 4, padding: "1px 4px" }}>
              ⌘K
            </span>
          </div>
          <button className="hdp__btn" onClick={() => onNavigate("alerts")}>
            <span className="hdp__alert-dot" />
            Alerts{alertCount > 0 ? ` (${alertCount})` : ""}
          </button>
          <button className="hdp__btn hdp__btn--primary" onClick={onNewAssessment}>
            New assessment
          </button>
        </header>

        <div className="hdp__content">{children}</div>

        <footer className="hdp__footer">
          <span className="hdp__footer-note">Decision support only. Model output does not replace clinical judgement.</span>
          <span className="hdp__footer-build mono">v0.1 · rule-based scorer</span>
        </footer>
      </main>
    </div>
  );
}
