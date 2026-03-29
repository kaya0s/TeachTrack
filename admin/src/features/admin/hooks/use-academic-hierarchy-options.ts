"use client";

import { useEffect, useMemo, useState } from "react";

import { getColleges, getDepartments, getMajors } from "@/features/admin/api";
import type { AdminCollege, AdminDepartment, AdminMajor, AdminAcademicFilters } from "@/features/admin/types";

type State = {
  colleges: AdminCollege[];
  departments: AdminDepartment[];
  majors: AdminMajor[];
  loadingColleges: boolean;
  loadingDepartments: boolean;
  loadingMajors: boolean;
};

export function useAcademicHierarchyOptions(filters: AdminAcademicFilters): State {
  const [colleges, setColleges] = useState<AdminCollege[]>([]);
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [majors, setMajors] = useState<AdminMajor[]>([]);
  const [loadingColleges, setLoadingColleges] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingMajors, setLoadingMajors] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingColleges(true);
    getColleges("?limit=500")
      .then((res) => {
        if (cancelled) return;
        setColleges(res.items ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setColleges([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingColleges(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const collegeId = filters.college_id ?? null;
    const hasDepartmentSelection = Boolean(filters.department_id);

    if (!collegeId && !hasDepartmentSelection) {
      setDepartments([]);
      return;
    }

    setLoadingDepartments(true);
    const request = collegeId
      ? getDepartments(collegeId, "?limit=500")
      : getDepartments(undefined, "?limit=500");
    request
      .then((res) => {
        if (cancelled) return;
        setDepartments(res.items ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setDepartments([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDepartments(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters.college_id, filters.department_id]);

  useEffect(() => {
    let cancelled = false;
    const departmentId = filters.department_id ?? null;
    const hasMajorSelection = Boolean(filters.major_id);

    if (!departmentId && !hasMajorSelection) {
      setMajors([]);
      return;
    }

    setLoadingMajors(true);
    const request = departmentId
      ? getMajors(undefined, "?limit=500", departmentId)
      : getMajors(undefined, "?limit=500");
    request
      .then((res) => {
        if (cancelled) return;
        setMajors(res.items ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setMajors([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingMajors(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters.department_id, filters.major_id]);

  return useMemo(
    () => ({
      colleges,
      departments,
      majors,
      loadingColleges,
      loadingDepartments,
      loadingMajors,
    }),
    [colleges, departments, majors, loadingColleges, loadingDepartments, loadingMajors],
  );
}

