import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrajectoryPoint } from "../types";
import "./TrajectoryChart.css";

interface TrajectoryChartProps {
  trajectory: TrajectoryPoint[];
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;

/** `time` may be an ISO timestamp or a generic label like "assessment_3" —
 * this dashboard has no assumptions about which a future dataset will use. */
function formatTimeLabel(time: string): string {
  if (ISO_DATE_PATTERN.test(time)) {
    const parsed = new Date(time);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
  }
  return time.replace(/_/g, " ");
}

function TrajectoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: TrajectoryPoint & { label: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="trajectory-chart__tooltip">
      <div className="trajectory-chart__tooltip-date">{point.label}</div>
      <div className="trajectory-chart__tooltip-value">{Math.round(point.risk * 100)}% risk</div>
    </div>
  );
}

export function TrajectoryChart({ trajectory }: TrajectoryChartProps) {
  const data = trajectory.map((point) => ({ ...point, label: formatTimeLabel(point.time) }));

  return (
    <div className="trajectory-chart">
      <h3 className="trajectory-chart__title">Risk trajectory</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="label"
            interval={0}
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--baseline)" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<TrajectoryTooltip />} />
          <Line
            type="monotone"
            dataKey="risk"
            stroke="var(--series-blue)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--series-blue)", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
