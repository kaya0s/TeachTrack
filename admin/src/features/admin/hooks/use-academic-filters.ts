"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { AdminAcademicDatePreset, AdminAcademicFilters } from "@/features/admin/types";

function parseIntOrNull(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toISODate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolvePreset(preset: AdminAcademicDatePreset) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  if (preset === "today") {
    return { date_from: toISODate(start), date_to: toISODate(end) };
  }
  if (preset === "last_7_days") {
    start.setDate(start.getDate() - 6);
    return { date_from: toISODate(start), date_to: toISODate(end) };
  }
  start.setDate(start.getDate() - 29);
  return { date_from: toISODate(start), date_to: toISODate(end) };
}

export function useAcademicFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<AdminAcademicFilters>(
    () => ({
      college_id: parseIntOrNull(searchParams.get("college_id")),
      department_id: parseIntOrNull(searchParams.get("department_id")),
      major_id: parseIntOrNull(searchParams.get("major_id")),
      date_from: searchParams.get("date_from"),
      date_to: searchParams.get("date_to"),
      date_preset: (searchParams.get("date_preset") as AdminAcademicDatePreset | null) ?? null,
    }),
    [searchParams],
  );

  const write = useCallback(
    (patch: Partial<AdminAcademicFilters>) => {
      const next = new URLSearchParams(searchParams.toString());
      let merged = { ...filters, ...patch };

      if ("college_id" in patch && patch.college_id == null) {
        merged = { ...merged, department_id: null, major_id: null };
      }
      if ("department_id" in patch && patch.department_id == null) {
        merged = { ...merged, major_id: null };
      }

      if (patch.date_preset) {
        const range = resolvePreset(patch.date_preset);
        merged = { ...merged, ...range, date_preset: patch.date_preset };
      }

      const entries: Array<[keyof AdminAcademicFilters, string | number | null | undefined]> = [
        ["college_id", merged.college_id],
        ["department_id", merged.department_id],
        ["major_id", merged.major_id],
        ["date_from", merged.date_from],
        ["date_to", merged.date_to],
        ["date_preset", merged.date_preset],
      ];

      for (const [key, value] of entries) {
        if (value === null || value === undefined || value === "") {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }

      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filters, pathname, router, searchParams],
  );

  const clearFilter = useCallback(
    (key: keyof AdminAcademicFilters) => {
      if (key === "college_id") {
        write({ college_id: null, department_id: null, major_id: null });
        return;
      }
      if (key === "department_id") {
        write({ department_id: null, major_id: null });
        return;
      }
      write({ [key]: null });
    },
    [write],
  );

  const clearAll = useCallback(() => {
    write({
      college_id: null,
      department_id: null,
      major_id: null,
      date_from: null,
      date_to: null,
      date_preset: null,
    });
  }, [write]);

  return {
    filters,
    setFilters: write,
    clearFilter,
    clearAll,
  };
}
