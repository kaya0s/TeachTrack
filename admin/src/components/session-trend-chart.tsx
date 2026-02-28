"use client";

import { useEffect, useMemo, useState } from "react";

type LineDef<T> = {
  key: keyof T;
  label: string;
  colorClass: string;
  stroke: string;
};

type Props<T> = {
  title: string;
  data: T[];
  xLabel: (row: T) => string;
  lines: Array<LineDef<T>>;
  yMax?: number;
  hoverMode?: "points" | "x-axis";
  showHoverLine?: boolean;
  heightClassName?: string;
  onHoverRowChange?: (row: T | null, index: number | null) => void;
  centerMode?: "zero" | "mean";
  smoothCurves?: boolean;
  showPoints?: boolean;
};

export function SessionTrendChart<T extends Record<string, string | number>>({
  title,
  data,
  xLabel,
  lines,
  yMax,
  hoverMode = "points",
  showHoverLine = false,
  heightClassName = "h-64",
  onHoverRowChange,
  centerMode = "zero",
  smoothCurves = false,
  showPoints = true,
}: Props<T>) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const maxVal = useMemo(() => {
    if (yMax !== undefined) return yMax;
    let max = 1;
    for (const row of data) {
      for (const line of lines) {
        const value = Number(row[line.key] ?? 0);
        if (value > max) max = value;
      }
    }
    return max;
  }, [data, lines, yMax]);

  const meanVal = useMemo(() => {
    let total = 0;
    let count = 0;
    for (const row of data) {
      for (const line of lines) {
        total += Number(row[line.key] ?? 0);
        count += 1;
      }
    }
    return count > 0 ? total / count : 0;
  }, [data, lines]);

  const maxDeviation = useMemo(() => {
    let max = 1;
    for (const row of data) {
      for (const line of lines) {
        const value = Number(row[line.key] ?? 0);
        const deviation = Math.abs(value - meanVal);
        if (deviation > max) max = deviation;
      }
    }
    return max;
  }, [data, lines, meanVal]);

  if (!data.length) {
    return <p className="text-sm text-muted-foreground">No chart data available.</p>;
  }

  const width = 900;
  const height = 260;
  const padX = 30;
  const padY = 18;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;

  const getX = (idx: number) => padX + idx * stepX;
  const getY = (value: number) => {
    if (centerMode === "mean") {
      const midY = padY + plotH / 2;
      const amplitude = plotH * 0.44;
      const normalized = (value - meanVal) / maxDeviation;
      const y = midY - normalized * amplitude;
      return Math.max(padY, Math.min(height - padY, y));
    }
    return padY + (1 - value / maxVal) * plotH;
  };
  const hoverX = hoverIdx !== null ? getX(hoverIdx) : null;

  const buildSmoothPath = (points: Array<{ x: number; y: number }>) => {
    if (!points.length) return "";
    if (points.length < 3) {
      return `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
    }
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[i - 1] ?? points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] ?? p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  useEffect(() => {
    if (!onHoverRowChange) return;
    if (hoverIdx === null) {
      onHoverRowChange(null, null);
      return;
    }
    onHoverRowChange(data[hoverIdx], hoverIdx);
  }, [data, hoverIdx, onHoverRowChange]);

  return (
    <div className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/70 p-3 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="rounded-md bg-muted/60 px-2 py-1 text-sm font-semibold leading-none">{title}</h4>
        <div className="flex flex-wrap items-center gap-2">
          {lines.map((line) => (
            <span
              key={line.label}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/50 px-2 py-0.5 text-xs text-muted-foreground"
            >
              <span className={`h-2 w-2 rounded-full ${line.colorClass}`} />
              {line.label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className={`${heightClassName} w-full`}>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padY + plotH * ratio;
            return (
              <line
                key={ratio}
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeDasharray="3 6"
                className="text-border/50"
              />
            );
          })}

          {showHoverLine && hoverX !== null ? (
            <line
              x1={hoverX}
              x2={hoverX}
              y1={padY}
              y2={height - padY}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              opacity="0.9"
            />
          ) : null}

          {lines.map((line) => {
            const points = data.map((row, idx) => ({
              x: getX(idx),
              y: getY(Number(row[line.key] ?? 0)),
            }));

            if (smoothCurves) {
              return (
                <path
                  key={line.label}
                  fill="none"
                  stroke={line.stroke}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  d={buildSmoothPath(points)}
                />
              );
            }

            const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
            return (
              <polyline
                key={line.label}
                fill="none"
                stroke={line.stroke}
                strokeWidth="2.25"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={polylinePoints}
              />
            );
          })}

          {showPoints ? data.map((row, idx) => {
            const x = getX(idx);
            return (
              <g key={`p-${idx}`}>
                {lines.map((line) => {
                  const value = Number(row[line.key] ?? 0);
                  return (
                    <circle
                      key={`${String(line.key)}-${idx}`}
                      cx={x}
                      cy={getY(value)}
                      r={hoverIdx === idx ? 4.2 : 3}
                      fill={line.stroke}
                      onMouseEnter={hoverMode === "points" ? () => setHoverIdx(idx) : undefined}
                      onMouseLeave={hoverMode === "points" ? () => setHoverIdx(null) : undefined}
                    />
                  );
                })}
              </g>
            );
          }) : null}

          {hoverMode === "x-axis" ? (
            <rect
              x={padX}
              y={padY}
              width={plotW}
              height={plotH}
              fill="transparent"
              onMouseMove={(event) => {
                const svg = event.currentTarget.ownerSVGElement;
                if (!svg) return;
                const rect = svg.getBoundingClientRect();
                const relativeX = ((event.clientX - rect.left) / rect.width) * width;
                if (data.length <= 1) {
                  setHoverIdx(0);
                  return;
                }
                const raw = (relativeX - padX) / stepX;
                const nextIdx = Math.max(0, Math.min(data.length - 1, Math.round(raw)));
                setHoverIdx(nextIdx);
              }}
              onMouseLeave={() => setHoverIdx(null)}
            />
          ) : null}
        </svg>

        {hoverIdx !== null ? (
          <div className="pointer-events-none absolute right-2 top-2 rounded-md border border-border bg-card p-2 text-xs shadow-sm">
            <p className="mb-1 font-medium">{xLabel(data[hoverIdx])}</p>
            {lines.map((line) => (
              <p key={`tt-${line.label}`} className="text-muted-foreground">
                {line.label}: <span className="font-medium text-foreground">{Number(data[hoverIdx][line.key] ?? 0).toFixed(2)}</span>
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
