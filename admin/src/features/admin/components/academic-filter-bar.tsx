"use client";

import { Filter, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  AdminAcademicDatePreset,
  AdminAcademicFilters,
  AdminCollege,
  AdminDepartment,
  AdminMajor,
} from "@/features/admin/types";

type Props = {
  filters: AdminAcademicFilters;
  colleges: AdminCollege[];
  departments: AdminDepartment[];
  majors: AdminMajor[];
  includeDate?: boolean;
  onChange: (patch: Partial<AdminAcademicFilters>) => void;
  onClearFilter: (key: keyof AdminAcademicFilters) => void;
  onClearAll: () => void;
};

const PRESETS: Array<{ id: AdminAcademicDatePreset; label: string }> = [
  { id: "today", label: "Today" },
  { id: "last_7_days", label: "Last 7 days" },
  { id: "last_30_days", label: "Last 30 days" },
];

export function AcademicFilterBar({
  filters,
  colleges,
  departments,
  majors,
  includeDate = false,
  onChange,
  onClearFilter,
  onClearAll,
}: Props) {
  const selectedCollege = colleges.find((row) => row.id === filters.college_id);
  const selectedDepartment = departments.find((row) => row.id === filters.department_id);
  const selectedMajor = majors.find((row) => row.id === filters.major_id);

  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-card/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background px-2 py-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={filters.college_id ?? ""}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : null;
              onChange({ college_id: value, department_id: null, major_id: null });
            }}
            className="bg-transparent text-xs font-semibold outline-none"
          >
            <option value="">All colleges</option>
            {colleges.map((college) => (
              <option key={college.id} value={college.id}>
                {college.name}
              </option>
            ))}
          </select>
        </div>

        <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background px-2 py-1.5">
          <select
            value={filters.department_id ?? ""}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : null;
              onChange({ department_id: value, major_id: null });
            }}
            className="bg-transparent text-xs font-semibold outline-none"
            disabled={!filters.college_id}
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>

        <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background px-2 py-1.5">
          <select
            value={filters.major_id ?? ""}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : null;
              onChange({ major_id: value });
            }}
            className="bg-transparent text-xs font-semibold outline-none"
            disabled={!filters.department_id}
          >
            <option value="">All majors</option>
            {majors.map((major) => (
              <option key={major.id} value={major.id}>
                {major.code}
              </option>
            ))}
          </select>
        </div>

        {includeDate ? (
          <>
            <div className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background px-2 py-1">
              <input
                type="date"
                value={filters.date_from ?? ""}
                onChange={(e) => onChange({ date_from: e.target.value || null, date_preset: null })}
                className="bg-transparent text-xs font-semibold outline-none"
              />
            </div>
            <div className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background px-2 py-1">
              <input
                type="date"
                value={filters.date_to ?? ""}
                onChange={(e) => onChange({ date_to: e.target.value || null, date_preset: null })}
                className="bg-transparent text-xs font-semibold outline-none"
              />
            </div>
            <div className="flex items-center gap-1">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  size="sm"
                  variant={filters.date_preset === preset.id ? "default" : "outline"}
                  className="h-7 text-[11px]"
                  onClick={() => onChange({ date_preset: preset.id })}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </>
        ) : null}

        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearAll}>
          Clear all
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {selectedCollege ? (
          <Badge tone="default" className="gap-1">
            {selectedCollege.name}
            <button type="button" onClick={() => onClearFilter("college_id")}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ) : null}
        {selectedDepartment ? (
          <Badge tone="default" className="gap-1">
            {selectedDepartment.name}
            <button type="button" onClick={() => onClearFilter("department_id")}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ) : null}
        {selectedMajor ? (
          <Badge tone="default" className="gap-1">
            {selectedMajor.code}
            <button type="button" onClick={() => onClearFilter("major_id")}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ) : null}
        {filters.date_from || filters.date_to ? (
          <Badge tone="default" className="gap-1">
            {`${filters.date_from || "..."}`}-{`${filters.date_to || "..."}`}
            <button
              type="button"
              onClick={() => {
                onClearFilter("date_from");
                onClearFilter("date_to");
                onClearFilter("date_preset");
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
