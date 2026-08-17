import type { Driver } from "../types";
import "./DriversList.css";

interface DriversListProps {
  drivers: Driver[];
}

function formatFeatureName(feature: string): string {
  return feature
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function DriversList({ drivers }: DriversListProps) {
  const maxAbsImpact = Math.max(...drivers.map((d) => Math.abs(d.impact)), 0.01);

  return (
    <div className="drivers-list">
      <h3 className="drivers-list__title">Top explainable drivers</h3>
      <ul className="drivers-list__items">
        {drivers.map((driver) => {
          const isPositive = driver.impact >= 0;
          const widthPercent = (Math.abs(driver.impact) / maxAbsImpact) * 100;
          return (
            <li className="drivers-list__item" key={driver.feature}>
              <span className="drivers-list__name">{formatFeatureName(driver.feature)}</span>
              <div className="drivers-list__bar-track">
                <div className="drivers-list__bar-baseline" />
                <div
                  className={`drivers-list__bar drivers-list__bar--${isPositive ? "pos" : "neg"}`}
                  style={{ width: `${widthPercent / 2}%` }}
                />
              </div>
              <span className="drivers-list__value">
                {isPositive ? "+" : ""}
                {driver.impact.toFixed(2)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
