import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { ActivityBucket } from "@/lib/dashboard";

export type ActivitySparklineProps = {
  series: ActivityBucket[];
};

export function ActivitySparkline({ series }: ActivitySparklineProps) {
  if (series.length === 0) {
    return (
      <Card>
        <CardHeader title="Scan activity" />
        <CardBody>
          <p className="text-sm text-slate-500">No scans recorded yet.</p>
        </CardBody>
      </Card>
    );
  }

  const width = 600;
  const height = 96;
  const padding = 4;
  const maxCount = Math.max(1, ...series.map((bucket) => bucket.count));
  const step = (width - padding * 2) / Math.max(1, series.length - 1);

  const points = series
    .map((bucket, i) => {
      const x = padding + i * step;
      const y = height - padding - (bucket.count / maxCount) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const area = `${padding},${height - padding} ${points} ${padding + (series.length - 1) * step},${height - padding}`;

  return (
    <Card>
      <CardHeader
        title="Scan activity"
        description="Scans per minute, from the first scan until now."
      />
      <CardBody>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full" role="img" aria-label="Scans over time">
          <polygon points={area} fill="rgba(15, 23, 42, 0.08)" />
          <polyline
            points={points}
            fill="none"
            stroke="rgb(15, 23, 42)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        <div className="mt-1 flex justify-between text-xs text-slate-400">
          <span>
            {new Date(series[0].t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span>{series.reduce((n, bucket) => n + bucket.count, 0)} total scans</span>
          <span>
            {new Date(series[series.length - 1].t).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
