"use client";

import { useMemo, useState } from "react";

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
};

export function SessionTrendChart<T extends Record<string, string | number>>({
  title,
  data,
  xLabel,
  lines,
  yMax,
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
  const getY = (value: number) => padY + (1 - value / maxVal) * plotH;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        <div className="flex flex-wrap items-center gap-3">
          {lines.map((line) => (
            <span key={line.label} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${line.colorClass}`} />
              {line.label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padY + plotH * ratio;
            return <line key={ratio} x1={padX} x2={width - padX} y1={y} y2={y} stroke="currentColor" className="text-border/60" />;
          })}

          {lines.map((line) => {
            const points = data
              .map((row, idx) => `${getX(idx)},${getY(Number(row[line.key] ?? 0))}`)
              .join(" ");
            return (
              <polyline
                key={line.label}
                fill="none"
                stroke={line.stroke}
                strokeWidth="2.25"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
              />
            );
          })}

          {data.map((row, idx) => {
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
                      onMouseEnter={() => setHoverIdx(idx)}
                      onMouseLeave={() => setHoverIdx(null)}
                    />
                  );
                })}
              </g>
            );
          })}
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
