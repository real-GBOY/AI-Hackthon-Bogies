import { useMemo, useState } from "react";
import type { Patient } from "../types";
import "./PatientQueue.css";

type SortKey = "risk" | "name" | "age";
type SortDirection = "asc" | "desc";

interface PatientQueueProps {
  patients: Patient[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const TREND_ICON: Record<string, string> = {
  rising: "↑",
  stable: "→",
  falling: "↓",
};

function sortValue(patient: Patient, key: SortKey): number | string {
  if (key === "name") return patient.name;
  if (key === "age") return patient.age;
  return patient.riskResult.risk_score;
}

export function PatientQueue({ patients, selectedId, onSelect }: PatientQueueProps) {
  const [sortKey, setSortKey] = useState<SortKey>("risk");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedPatients = useMemo(() => {
    const sorted = [...patients].sort((a, b) => {
      const aValue = sortValue(a, sortKey);
      const bValue = sortValue(b, sortKey);
      if (typeof aValue === "string" && typeof bValue === "string") return aValue.localeCompare(bValue);
      return (aValue as number) - (bValue as number);
    });
    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [patients, sortKey, sortDirection]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  }

  function sortIndicator(key: SortKey): string {
    if (key !== sortKey) return "";
    return sortDirection === "asc" ? " ▲" : " ▼";
  }

  return (
    <div className="patient-queue">
      <h3 className="patient-queue__title">Prioritized follow-up queue</h3>
      <table className="patient-queue__table">
        <thead>
          <tr>
            <th onClick={() => handleSort("name")} className="patient-queue__sortable">
              Patient{sortIndicator("name")}
            </th>
            <th onClick={() => handleSort("age")} className="patient-queue__sortable">
              Age{sortIndicator("age")}
            </th>
            <th onClick={() => handleSort("risk")} className="patient-queue__sortable">
              Risk{sortIndicator("risk")}
            </th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {sortedPatients.map((patient) => {
            const { risk_score: riskScore, risk_category: riskCategory, trajectory_direction: trend } =
              patient.riskResult;
            const isSelected = patient.id === selectedId;
            return (
              <tr
                key={patient.id}
                className={`patient-queue__row${isSelected ? " patient-queue__row--selected" : ""}`}
                onClick={() => onSelect(patient.id)}
              >
                <td>
                  <div className="patient-queue__name">{patient.name}</div>
                  <div className="patient-queue__id">{patient.id}</div>
                </td>
                <td className="patient-queue__numeric">{patient.age}</td>
                <td className="patient-queue__numeric">
                  <span className={`patient-queue__risk-pill patient-queue__risk-pill--${riskCategory}`}>
                    {Math.round(riskScore * 100)}%
                  </span>
                </td>
                <td className={`patient-queue__trend patient-queue__trend--${trend}`}>{TREND_ICON[trend]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
