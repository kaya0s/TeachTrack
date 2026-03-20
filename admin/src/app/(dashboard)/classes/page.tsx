"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  GraduationCap,
  MoreVertical,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
  UserPlus,
  Users,
  Filter,
  X,
  Globe,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  assignSectionTeacher,
  createClass,
  createSection,
  createSubject,
  deleteSection,
  deleteSubject,
  getColleges,
  getMajors,
  getSections,
  getSubjects,
  getTeachers,
  unassignSectionTeacher,
  uploadSubjectCoverImage,
  updateSection,
  updateSubject,
} from "@/features/admin/api";
import type {
  AdminSection,
  AdminSectionPoolItem,
  AdminSubject,
  AdminTeacher,
  AdminCollege,
  AdminMajor
} from "@/features/admin/types";
import { TeacherSelect } from "@/features/admin/components/teacher-select";
import { SearchBar } from "@/components/ui/search-bar";
import { getCurrentActorUserId } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

type ModalMode = "create" | "edit";

type PoolSectionCard = {
  key: string;
  id: number;
  name: string;
  major_id: number | null;
  major_name: string | null;
  year_level: number | null;
  section_letter: string | null;
  college_name: string | null;
  college_logo_path: string | null;
  subject_names: string[];
  assignments: Array<{ subject_name: string; teacher_name: string }>;
};

function teacherLabel(entity: { teacher_fullname: string | null; teacher_username: string }): string {
  return entity.teacher_fullname?.trim() || entity.teacher_username || "Unassigned";
}

function isSectionUnassigned(section: AdminSection): boolean {
  const username = (section.teacher_username ?? "").trim().toLowerCase();
  return !section.teacher_id || username === "unassigned" || username === "available";
}

function canAssignSectionTeacher(section: AdminSection): boolean {
  return Boolean(section.subject_id);
}

export default function CourseManagementPage() {
  const { notify } = useToast();
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [poolSections, setPoolSections] = useState<AdminSectionPoolItem[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [poolQuery, setPoolQuery] = useState("");
  const [poolSortBy, setPoolSortBy] = useState<"name" | "college">("name");
  
  // Separate filtering state for class sections
  const [poolSelectedCollegeId, setPoolSelectedCollegeId] = useState<string>("all");
  const [poolSelectedMajorId, setPoolSelectedMajorId] = useState<string>("all");

  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [subjectModalMode, setSubjectModalMode] = useState<ModalMode>("create");
  const [editingSubject, setEditingSubject] = useState<AdminSubject | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [subjectCoverImageUrl, setSubjectCoverImageUrl] = useState("");
  const [subjectCoverFile, setSubjectCoverFile] = useState<File | null>(null);
  const [subjectCoverPreview, setSubjectCoverPreview] = useState("");
  const [uploadingSubjectCover, setUploadingSubjectCover] = useState(false);
  const [subjectCollegeId, setSubjectCollegeId] = useState<string>("all");

  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [sectionModalMode, setSectionModalMode] = useState<ModalMode>("create");
  const [editingSection, setEditingSection] = useState<AdminSection | null>(null);
  const [sectionName, setSectionName] = useState("");
  const [sectionSubjectIds, setSectionSubjectIds] = useState<number[]>([]);

  const [classModalOpen, setClassModalOpen] = useState(false);
  const [newClassSubjectId, setNewClassSubjectId] = useState<number | null>(null);
  const [newClassSubjectName, setNewClassSubjectName] = useState("");
  const [newClassSubjectCode, setNewClassSubjectCode] = useState("");
  const [newClassSectionName, setNewClassSectionName] = useState("");

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningSection, setAssigningSection] = useState<AdminSection | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [openSubjectMenuId, setOpenSubjectMenuId] = useState<number | null>(null);
  const [openSectionMenuId, setOpenSectionMenuId] = useState<number | null>(null);
  const [subjectDeleteModalOpen, setSubjectDeleteModalOpen] = useState(false);
  const [sectionDeleteModalOpen, setSectionDeleteModalOpen] = useState(false);
  const [activeSubject, setActiveSubject] = useState<AdminSubject | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection | null>(null);
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<number[]>([]);
  const [unassignedOpen, setUnassignedOpen] = useState(false);
  const [detailSubject, setDetailSubject] = useState<AdminSubject | null>(null);
  const [subjectDetailModalOpen, setSubjectDetailModalOpen] = useState(false);
  const [subjectSectionModalOpen, setSubjectSectionModalOpen] = useState(false);
  const [subjectSectionQuery, setSubjectSectionQuery] = useState("");
  const [subjectSectionCollegeId, setSubjectSectionCollegeId] = useState<string>("all");
  const [subjectSectionMajorId, setSubjectSectionMajorId] = useState<string>("all");
  const [subjectSectionCollegeMenuOpen, setSubjectSectionCollegeMenuOpen] = useState(false);
  const [subjectSectionMajors, setSubjectSectionMajors] = useState<AdminMajor[]>([]);
  const [selectedSubjectSectionId, setSelectedSubjectSectionId] = useState<number | null>(null);
  const [linkingSubjectSection, setLinkingSubjectSection] = useState(false);
  const [sectionInfoModalOpen, setSectionInfoModalOpen] = useState(false);
  const [activePoolSectionKey, setActivePoolSectionKey] = useState<string | null>(null);

  // Academic Hierarchy State
  const [colleges, setColleges] = useState<AdminCollege[]>([]);
  const [majors, setMajors] = useState<AdminMajor[]>([]);
  const [poolMajors, setPoolMajors] = useState<AdminMajor[]>([]); // Separate majors for class sections
  const [allMajors, setAllMajors] = useState<AdminMajor[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>("all");
  const [selectedMajorId, setSelectedMajorId] = useState<string>("all");
  const [yearLevel, setYearLevel] = useState("1");
  const [sectionLetter, setSectionLetter] = useState("A");
  const [creationStep, setCreationStep] = useState<1 | 2>(1);
  const [subjectStep, setSubjectStep] = useState<1 | 2>(1);
  const [processing, setProcessing] = useState(false);
  const [sectionSubjectFilterQuery, setSectionSubjectFilterQuery] = useState("");

  // Drag confirmation state
  const [pendingDrop, setPendingDrop] = useState<{ sectionName: string; subject: AdminSubject } | null>(null);
  const [dropConfirmOpen, setDropConfirmOpen] = useState(false);
  const currentActorUserId = useMemo(() => getCurrentActorUserId(), []);

  const sectionsBySubject = useMemo(() => {
    const map = new Map<number, AdminSection[]>();
    sections.forEach((section) => {
      if (!section.subject_id) return;
      const existing = map.get(section.subject_id) ?? [];
      existing.push(section);
      map.set(section.subject_id, existing);
    });
    return map;
  }, [sections]);

  const filteredPoolSections = useMemo(() => {
    let result = poolSections;

    // If a college filter is selected, only show pool sections whose major belongs to that college.
    if (poolSelectedCollegeId !== "all" && poolMajors.length > 0) {
      const allowedMajorIds = new Set(
        poolMajors
          .filter((m) => m.college_id.toString() === poolSelectedCollegeId)
          .map((m) => m.id),
      );
      result = result.filter((ps) => !ps.major_id || allowedMajorIds.has(ps.major_id));
    }

    // If a major filter is selected, further filter by specific major
    if (poolSelectedMajorId !== "all" && poolSelectedCollegeId !== "all") {
      result = result.filter((ps) => ps.major_id?.toString() === poolSelectedMajorId);
    }

    // Apply search filter
    const q = poolQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((ps) => {
        if (ps.name.toLowerCase().includes(q)) return true;
        if ((ps.subject_name ?? "").toLowerCase().includes(q)) return true;
        return (ps.subject_names || []).some((name) => name.toLowerCase().includes(q));
      });
    }

    // Apply sorting
    if (poolSortBy === "college") {
      result.sort((a, b) => {
        const aMajor = a.major_id ? allMajors.find((m) => m.id === a.major_id) : undefined;
        const bMajor = b.major_id ? allMajors.find((m) => m.id === b.major_id) : undefined;
        const aCollege = aMajor ? colleges.find((c) => c.id === aMajor.college_id)?.name ?? "" : "";
        const bCollege = bMajor ? colleges.find((c) => c.id === bMajor.college_id)?.name ?? "" : "";
        return aCollege.localeCompare(bCollege) || a.name.localeCompare(b.name);
      });
    } else {
      // Default sort by name
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [poolSections, poolMajors, poolSelectedCollegeId, poolSelectedMajorId, poolQuery, poolSortBy, allMajors, colleges]);

  const filteredSubjects = useMemo(() => {
    let result = subjects;

    // Filter subjects to those that belong to the selected college, OR are Global (no college), OR have sections matching our active filters
    if (selectedCollegeId !== "all" || selectedMajorId !== "all") {
      result = result.filter(item => {
        // ALWAYS show global subjects (no owning college)
        const isGlobal = !item.college_id;
        if (isGlobal) return true;

        // Direct match if subject belongs to the selected college
        const matchesCollege = selectedCollegeId !== "all" && item.college_id?.toString() === selectedCollegeId;

        // Relation match through sections
        const related = sectionsBySubject.get(item.id) ?? [];
        const hasMatchingSections = related.length > 0;

        return matchesCollege || hasMatchingSections;
      });
    }

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((item) => {
        const subjectMatch = item.name.toLowerCase().includes(q) || (item.code ?? "").toLowerCase().includes(q);
        if (subjectMatch) return true;
        const relatedSections = sectionsBySubject.get(item.id) ?? [];
        return relatedSections.some(
          (section) =>
            section.name.toLowerCase().includes(q) ||
            section.subject_name.toLowerCase().includes(q) ||
            section.teacher_username.toLowerCase().includes(q) ||
            (section.teacher_fullname ?? "").toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [query, sectionsBySubject, subjects, selectedCollegeId, selectedMajorId]);

  const filteredSubjectsForAssignment = useMemo(() => {
    let list = subjects;

    if (selectedCollegeId !== "all") {
      list = list.filter((subject) => {
        // Always include global subjects
        if (!subject.college_id) return true;
        return subject.college_id.toString() === selectedCollegeId;
      });
    }

    const q = sectionSubjectFilterQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((subject) => {
        const nameMatch = subject.name.toLowerCase().includes(q);
        const codeMatch = (subject.code ?? "").toLowerCase().includes(q);
        return nameMatch || codeMatch;
      });
    }

    return list;
  }, [subjects, selectedCollegeId, sectionSubjectFilterQuery]);

  const majorById = useMemo(() => {
    const map = new Map<number, AdminMajor>();
    allMajors.forEach((major) => map.set(major.id, major));
    return map;
  }, [allMajors]);

  const addableSectionsForSubject = useMemo(() => {
    if (!detailSubject) return [];

    const existingIds = new Set((sectionsBySubject.get(detailSubject.id) ?? []).map((section) => section.id));
    let result = poolSections.filter((poolSection) => {
      if (existingIds.has(poolSection.id)) return false;
      if (typeof poolSection.subject_id === "number" && poolSection.subject_id > 0) return false;
      return (poolSection.subjects_count ?? 0) === 0 || !poolSection.subject_names?.length;
    });

    if (subjectSectionCollegeId !== "all") {
      result = result.filter((poolSection) => {
        if (!poolSection.major_id) return false;
        const major = majorById.get(poolSection.major_id);
        return major?.college_id.toString() === subjectSectionCollegeId;
      });
    }

    if (subjectSectionMajorId !== "all") {
      result = result.filter((poolSection) => poolSection.major_id?.toString() === subjectSectionMajorId);
    }

    const q = subjectSectionQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((poolSection) => poolSection.name.toLowerCase().includes(q));
    }

    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }, [
    detailSubject,
    poolSections,
    sectionsBySubject,
    subjectSectionCollegeId,
    subjectSectionMajorId,
    subjectSectionQuery,
    majorById,
  ]);

  const selectedSubjectSectionCollege = useMemo(() => {
    if (subjectSectionCollegeId === "all") return null;
    return colleges.find((college) => college.id.toString() === subjectSectionCollegeId) ?? null;
  }, [colleges, subjectSectionCollegeId]);

  const poolSectionCards = useMemo<PoolSectionCard[]>(() => {
    const map = new Map<string, PoolSectionCard>();

    filteredPoolSections.forEach((section) => {
      const major = section.major_id ? majorById.get(section.major_id) : undefined;
      const college = major ? colleges.find((item) => item.id === major.college_id) : undefined;
      const key = `${section.name.trim().toLowerCase()}::${section.major_id ?? "none"}::${section.year_level ?? "none"}::${section.section_letter ?? "none"}`;
      const subjectNames = new Set<string>();
      const assignments: Array<{ subject_name: string; teacher_name: string }> = [];

      const addSubjectName = (name: string | null | undefined) => {
        const value = (name ?? "").trim();
        if (!value || value.toLowerCase() === "unassigned") return;
        subjectNames.add(value);
      };

      addSubjectName(section.subject_name);
      (section.subject_names ?? []).forEach((name) => addSubjectName(name));

      const teacherName = (section.teacher_fullname ?? section.teacher_username ?? "Unassigned").trim() || "Unassigned";
      if (subjectNames.size > 0) {
        subjectNames.forEach((subjectName) => {
          assignments.push({ subject_name: subjectName, teacher_name: teacherName });
        });
      } else {
        assignments.push({ subject_name: "No subject assigned", teacher_name: teacherName });
      }

      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          id: section.id,
          name: section.name,
          major_id: section.major_id ?? null,
          major_name: (section as { major_name?: string | null }).major_name ?? major?.name ?? null,
          year_level: section.year_level ?? null,
          section_letter: section.section_letter ?? null,
          college_name: college?.name ?? null,
          college_logo_path: college?.logo_path ?? null,
          subject_names: Array.from(subjectNames),
          assignments,
        });
        return;
      }

      existing.subject_names = Array.from(new Set([...existing.subject_names, ...Array.from(subjectNames)]));
      const mergedAssignments = [...existing.assignments, ...assignments];
      existing.assignments = mergedAssignments.filter((assignment, index) => {
        return (
          mergedAssignments.findIndex(
            (row) => row.subject_name === assignment.subject_name && row.teacher_name === assignment.teacher_name,
          ) === index
        );
      });
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredPoolSections, majorById, colleges]);

  const activePoolSection = useMemo(
    () => poolSectionCards.find((card) => card.key === activePoolSectionKey) ?? null,
    [poolSectionCards, activePoolSectionKey],
  );

  const unassignedSections = useMemo(
    () => sections.filter((section) => canAssignSectionTeacher(section) && isSectionUnassigned(section)),
    [sections]
  );

  const buildFilterParams = () => {
    const params: string[] = ["limit=500"];
    if (selectedCollegeId !== "all") params.push(`college_id=${selectedCollegeId}`);
    if (selectedMajorId !== "all") params.push(`major_id=${selectedMajorId}`);
    return `?${params.join("&")}`;
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, secs, pool, tchs, colls, majorRows] = await Promise.all([
        getSubjects("?limit=500"),
        getSections(buildFilterParams()),
        getSections("?limit=1000"),
        getTeachers("?limit=500"),
        getColleges("?limit=100"),
        getMajors(undefined, "?limit=1000"),
      ]);
      setSubjects(subs.items);
      setSections(secs.items);
      setPoolSections(pool.items);
      setTeachers(tchs.items);
      setColleges(colls.items);
      setAllMajors(majorRows.items);
    } catch (err) {
      notify({
        tone: "danger",
        title: "Load failed",
        description: getErrorMessage(err, "Could not load course management data."),
      });
    } finally {
      setLoading(false);
    }
  }, [notify, selectedCollegeId, selectedMajorId]);

  const loadMajorsData = async (collegeId: number) => {
    setProcessing(true);
    try {
      const res = await getMajors(collegeId);
      setMajors(res.items);
      if (res.items.length > 0) {
        setSelectedMajorId(res.items[0].id.toString());
      } else {
        setSelectedMajorId("all");
      }
    } catch (err) {
      notify({
        tone: "danger",
        title: "Load failed",
        description: getErrorMessage(err, "Could not load majors data."),
      });
    } finally {
      setProcessing(false);
    }
  };

  const loadPoolMajorsData = async (collegeId: number) => {
    setProcessing(true);
    try {
      const res = await getMajors(collegeId);
      setPoolMajors(res.items);
      setPoolSelectedMajorId("all");
    } catch (err) {
      notify({
        tone: "danger",
        title: "Load failed",
        description: getErrorMessage(err, "Could not load majors data."),
      });
    } finally {
      setProcessing(false);
    }
  };

  const loadSubjectSectionMajorsData = useCallback(async (collegeId: number) => {
    try {
      const res = await getMajors(collegeId);
      setSubjectSectionMajors(res.items);
      setSubjectSectionMajorId("all");
    } catch (err) {
      notify({
        tone: "danger",
        title: "Load failed",
        description: getErrorMessage(err, "Could not load majors data."),
      });
    }
  }, [notify]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (poolSelectedCollegeId !== "all") {
      loadPoolMajorsData(parseInt(poolSelectedCollegeId));
    } else {
      setPoolMajors([]);
      setPoolSelectedMajorId("all");
    }
  }, [poolSelectedCollegeId]);

  useEffect(() => {
    if (selectedCollegeId !== "all") {
      loadMajorsData(parseInt(selectedCollegeId));
    } else {
      setMajors([]);
      setSelectedMajorId("all");
    }
  }, [selectedCollegeId]);

  useEffect(() => {
    if (!subjectSectionModalOpen) return;
    if (subjectSectionCollegeId !== "all") {
      loadSubjectSectionMajorsData(parseInt(subjectSectionCollegeId));
    } else {
      setSubjectSectionMajors([]);
      setSubjectSectionMajorId("all");
    }
  }, [subjectSectionCollegeId, subjectSectionModalOpen, loadSubjectSectionMajorsData]);

  useEffect(() => {
    if (!selectedSubjectSectionId) return;
    const stillVisible = addableSectionsForSubject.some((item) => item.id === selectedSubjectSectionId);
    if (!stillVisible) {
      setSelectedSubjectSectionId(null);
    }
  }, [addableSectionsForSubject, selectedSubjectSectionId]);

  useEffect(() => {
    if (!sectionInfoModalOpen) return;
    if (!activePoolSection) {
      setSectionInfoModalOpen(false);
      setActivePoolSectionKey(null);
    }
  }, [sectionInfoModalOpen, activePoolSection]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-actions-menu]")) return;
      if (target?.closest("[data-subject-section-college-menu]")) return;
      setOpenSubjectMenuId(null);
      setOpenSectionMenuId(null);
      setSubjectSectionCollegeMenuOpen(false);
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenSubjectMenuId(null);
      setOpenSectionMenuId(null);
      setSubjectSectionCollegeMenuOpen(false);
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  function resetSubjectForm() {
    setSubjectName("");
    setSubjectCode("");
    setSubjectDescription("");
    setSubjectCoverImageUrl("");
    setSubjectCoverFile(null);
    setSubjectCoverPreview("");
    setSubjectCollegeId("all");
  }
  function resetSectionForm() {
    setSectionName("");
    setSectionSubjectIds([]);
  }


  async function doLinkSection(sectionName: string, subjectId: number) {
    try {
      await createSection({
        name: sectionName,
        subject_id: subjectId,
      });
      notify({
        tone: "success",
        title: "Section linked",
        description: `Linked ${sectionName} to subject.`,
      });
      await loadAll();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Link failed",
        description: getErrorMessage(err, "Could not link section."),
      });
    }
  }

  function openAddSectionForSubject() {
    if (!detailSubject) return;
    setSubjectSectionQuery("");
    setSelectedSubjectSectionId(null);
    setSubjectSectionCollegeId("all");
    setSubjectSectionMajorId("all");
    setSubjectSectionCollegeMenuOpen(false);
    setSubjectSectionModalOpen(true);
  }

  async function onAddSectionForSubjectSubmit(e: FormEvent) {
    e.preventDefault();
    if (!detailSubject) return;
    if (!selectedSubjectSectionId) return;

    const picked = poolSections.find((poolSection) => poolSection.id === selectedSubjectSectionId);

    try {
      setLinkingSubjectSection(true);
      await updateSection(selectedSubjectSectionId, { subject_id: detailSubject.id });
      notify({
        tone: "success",
        title: "Section added",
        description: `Added ${picked?.name ?? "section"} to ${detailSubject.name}.`,
      });
      setSubjectSectionModalOpen(false);
      setSubjectSectionQuery("");
      setSelectedSubjectSectionId(null);
      setSubjectSectionCollegeMenuOpen(false);
      await loadAll();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Add section failed",
        description: getErrorMessage(err, "Could not attach section to this subject."),
      });
    } finally {
      setLinkingSubjectSection(false);
    }
  }

  function openSubjectCreate() {
    setSubjectModalMode("create");
    setEditingSubject(null);
    resetSubjectForm();
    setSubjectStep(1);
    setSubjectModalOpen(true);
  }

  function openSubjectEdit(item: AdminSubject) {
    setSubjectModalMode("edit");
    setEditingSubject(item);
    setSubjectName(item.name);
    setSubjectCode(item.code ?? "");
    setSubjectDescription(item.description ?? "");
    setSubjectCoverImageUrl(item.cover_image_url ?? "");
    setSubjectCoverFile(null);
    setSubjectCoverPreview(item.cover_image_url ?? "");
    setSubjectCollegeId(item.college_id ? item.college_id.toString() : "all");
    setSubjectStep(2);
    setSubjectModalOpen(true);
  }

  function onSubjectCoverChange(file: File | null) {
    setSubjectCoverFile(file);
    if (!file) {
      setSubjectCoverPreview(subjectCoverImageUrl);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSubjectCoverPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function openSectionCreate() {
    setSectionModalMode("create");
    setEditingSection(null);
    setSectionName("");
    setSectionSubjectIds([]);
    setSelectedCollegeId("all");
    setSelectedMajorId("all");
    setYearLevel("1");
    setSectionLetter("A");
    setCreationStep(1);
    setSectionModalOpen(true);
  }

  function openSectionEdit(item: AdminSection) {
    setSectionModalMode("edit");
    setEditingSection(item);
    setSectionName(item.name);
    setSectionSubjectIds(item.subject_id ? [item.subject_id] : []);
    setSectionModalOpen(true);
  }

  function toggleSubjectExpanded(subjectId: number) {
    setExpandedSubjectIds((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    );
  }

  async function onSubjectSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      let resolvedCoverImageUrl = subjectCoverImageUrl.trim() || undefined;
      if (subjectCoverFile) {
        setUploadingSubjectCover(true);
        const uploaded = await uploadSubjectCoverImage(subjectCoverFile);
        resolvedCoverImageUrl = uploaded.secure_url;
      }

      if (subjectModalMode === "create") {
        await createSubject({
          name: subjectName.trim(),
          code: subjectCode.trim() || undefined,
          description: subjectDescription.trim() || undefined,
          cover_image_url: resolvedCoverImageUrl,
          college_id: subjectCollegeId !== "all" ? parseInt(subjectCollegeId) : undefined,
        });
        notify({ tone: "success", title: "Subject created" });
      } else if (editingSubject) {
        await updateSubject(editingSubject.id, {
          name: subjectName.trim(),
          code: subjectCode.trim() || "",
          description: subjectDescription.trim() || "",
          cover_image_url: resolvedCoverImageUrl || "",
          college_id: subjectCollegeId !== "all" ? parseInt(subjectCollegeId) : undefined,
        });
        notify({ tone: "success", title: "Subject updated" });
      }
      setSubjectModalOpen(false);
      setUploadingSubjectCover(false);
      await loadAll();
    } catch (err) {
      setUploadingSubjectCover(false);
      notify({
        tone: "danger",
        title: "Subject save failed",
        description: getErrorMessage(err, "Could not save subject."),
      });
    }
  }

  async function onSectionSubmit(e: FormEvent) {
    e.preventDefault();
    console.log("Submitting section form...");
    console.log("sectionSubjectIds:", sectionSubjectIds);
    console.log("sectionName:", sectionName);
    console.log("selectedMajorId:", selectedMajorId);
    console.log("yearLevel:", yearLevel);
    console.log("sectionLetter:", sectionLetter);
    
    try {
      if (sectionModalMode === "create") {
        const majorCode = majors.find((m) => m.id.toString() === selectedMajorId)?.code;
        const generatedName = majorCode ? `${majorCode}-${yearLevel}${sectionLetter}` : "";
        const finalSectionName = (sectionName.trim() || generatedName).trim();
        if (!finalSectionName) {
          notify({
            tone: "danger",
            title: "Section save failed",
            description: "Section name or academic hierarchy is required.",
          });
          return;
        }

        const duplicate = poolSections.some(
          (poolSection) => poolSection.name.trim().toLowerCase() === finalSectionName.toLowerCase(),
        );
        if (duplicate) {
          notify({
            tone: "danger",
            title: "Section save failed",
            description: `Section '${finalSectionName}' already exists.`,
          });
          return;
        }

        if (sectionSubjectIds.length > 1) {
          notify({
            tone: "danger",
            title: "Section save failed",
            description: "Select only one subject for this section.",
          });
          return;
        }

        const payload = {
          name: finalSectionName || undefined,
          subject_ids: sectionSubjectIds.length > 0 ? sectionSubjectIds : undefined,
          major_id: selectedMajorId !== "all" ? parseInt(selectedMajorId) : undefined,
          year_level: parseInt(yearLevel),
          section_letter: sectionLetter,
        };
        console.log("Payload being sent:", payload);
        
        await createSection(payload);
        notify({ 
          tone: "success", 
          title: "Section created", 
          description: sectionSubjectIds.length > 0 
            ? `Added to ${sectionSubjectIds.length} subject${sectionSubjectIds.length === 1 ? "" : "s"}.` 
            : "Created without subject assignment."
        });
      } else if (editingSection) {
        // For editing, we update the specific assignment
        await updateSection(editingSection.id, {
          name: sectionName.trim(),
          subject_id: sectionSubjectIds[0],
        });
        notify({ tone: "success", title: "Section updated" });
      }
      setSectionModalOpen(false);
      await loadAll();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Section save failed",
        description: getErrorMessage(err, "Could not save section."),
      });
    }
  }

  async function onClassCreateSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await createClass({
        subject_id: newClassSubjectId ?? undefined,
        subject_name: newClassSubjectId ? undefined : newClassSubjectName.trim(),
        subject_code: newClassSubjectId ? undefined : (newClassSubjectCode.trim() || undefined),
        section_name: undefined,
        major_id: selectedMajorId !== "all" ? parseInt(selectedMajorId) : undefined,
        year_level: parseInt(yearLevel),
        section_letter: sectionLetter,
      });
      notify({ tone: "success", title: "Class created", description: "Assign a teacher next." });
      setClassModalOpen(false);
      setNewClassSubjectId(null);
      setNewClassSubjectName("");
      setNewClassSubjectCode("");
      setNewClassSectionName("");
      await loadAll();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Class creation failed",
        description: getErrorMessage(err, "Could not create class."),
      });
    }
  }

  async function onAssignConfirm() {
    if (!assigningSection) return;
    try {
      if (!selectedTeacherId) return;
      if (!canAssignSectionTeacher(assigningSection)) {
        notify({
          tone: "danger",
          title: "Assignment blocked",
          description: "Assign this section to a subject first, then assign a teacher.",
        });
        return;
      }
      await assignSectionTeacher(assigningSection.id, selectedTeacherId);
      notify({ tone: "success", title: "Class assigned to teacher" });
      setAssignModalOpen(false);
      setAssigningSection(null);
      await loadAll();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Assignment failed",
        description: getErrorMessage(err, "Could not assign teacher."),
      });
    }
  }

  async function onSetSectionUnassigned() {
    if (!assigningSection) return;
    try {
      await unassignSectionTeacher(assigningSection.id);
      notify({ tone: "success", title: "Section set to unassigned" });
      setAssignModalOpen(false);
      setAssigningSection(null);
      setSelectedTeacherId(null);
      await loadAll();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Unassign failed",
        description: getErrorMessage(err, "Could not set section as unassigned."),
      });
    }
  }

  async function onDeleteSubject(item: AdminSubject) {
    try {
      await deleteSubject(item.id);
      notify({ tone: "success", title: "Subject deleted" });
      setSubjectDeleteModalOpen(false);
      setActiveSubject(null);
      await loadAll();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Delete failed",
        description: getErrorMessage(err, "Could not delete subject."),
      });
    }
  }

  async function onDeleteSection(item: AdminSection) {
    try {
      await deleteSection(item.id);
      notify({ tone: "success", title: "Section deleted" });
      setSectionDeleteModalOpen(false);
      setActiveSection(null);
      await loadAll();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Delete failed",
        description: getErrorMessage(err, "Could not delete section."),
      });
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader title={<><BookOpen className="h-5 w-5" />Course Management</>} description="Manage subjects, sections, and teacher assignments in one workspace." />

      {/* Unassigned Sections Warning */}
      {unassignedSections.length > 0 && (
          <Card className="border-warning/20 bg-warning/5 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10 border border-warning/20">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-sm font-black text-warning mb-1">
                    Unassigned Sections Detected
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You have {unassignedSections.length} section{unassignedSections.length === 1 ? "" : "s"} without teacher assignments. 
                    These sections need to be assigned to teachers to be active in the system.
                  </p>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 rounded-lg border border-warning/30 bg-warning/5 text-warning hover:bg-warning/10 hover:border-warning/40 font-bold text-xs"
                  onClick={() => setUnassignedOpen(!unassignedOpen)}
                >
                  <Users className="mr-1.5 h-3 w-3" />
                  {unassignedOpen ? "Hide" : "Show"} Sections
                  <ChevronRight className={cn(
                    "ml-1.5 h-3 w-3 transition-transform duration-200",
                    unassignedOpen && "rotate-90"
                  )} />
                </Button>

                {unassignedOpen && (
                  <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 rounded-lg border-warning/30 bg-warning/5 text-warning hover:bg-warning/10 hover:border-warning/40 font-bold text-xs"
                        onClick={() => {
                          const firstUnassigned = unassignedSections[0];
                          if (firstUnassigned && firstUnassigned.subject_id) {
                            const subj = subjects.find(s => s.id === firstUnassigned.subject_id);
                            if (subj) { setDetailSubject(subj); setSubjectDetailModalOpen(true); }
                          }
                        }}
                      >
                        <Users className="mr-1.5 h-3 w-3" />
                        Review Sections
                      </Button>
                      
                      <Button 
                        size="sm"
                        className="h-8 px-3 rounded-lg bg-warning text-warning-foreground hover:bg-warning/90 font-bold text-xs"
                        onClick={() => {
                          setAssigningSection(unassignedSections[0]);
                          setSelectedTeacherId(null);
                          setAssignModalOpen(true);
                        }}
                      >
                        <UserPlus className="mr-1.5 h-3 w-3" />
                        Assign Teacher
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {unassignedSections.slice(0, 6).map((section) => (
                        <div 
                          key={section.id}
                          className="flex flex-col p-3 rounded-lg bg-warning/5 border border-warning/20"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-6 w-6 rounded-full bg-warning/20 flex items-center justify-center">
                                <span className="text-[8px] font-bold text-warning">
                                  {section.name.charAt(0)}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-foreground truncate">
                                {section.name}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 rounded hover:bg-warning/10 text-warning"
                              onClick={() => {
                                setAssigningSection(section);
                                setSelectedTeacherId(section.teacher_id);
                                setAssignModalOpen(true);
                              }}
                            >
                              <UserPlus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] font-medium text-muted-foreground truncate">
                              {section.subject_name || "No subject"}
                            </span>
                          </div>
                        </div>
                      ))}
                      {unassignedSections.length > 6 && (
                        <div className="flex items-center justify-center p-3 rounded-lg bg-warning/5 border border-warning/20">
                          <span className="text-xs font-bold text-muted-foreground">
                            +{unassignedSections.length - 6} more
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-12 gap-4 items-start">
        <div className="col-span-12 xl:col-span-8 space-y-6">
          {/* Subjects Header and Controls */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <div>
                <h2 className="text-lg font-bold text-foreground">Subjects</h2>
                <p className="text-sm text-muted-foreground">Manage your course subjects and content</p>
              </div>
            </div>

            {/* Subject Search and Filter */}
            <div className="flex items-center gap-3">
              <SearchBar
                placeholder="Search subjects..."
                value={query}
                onChange={setQuery}
                className="w-20"
              />
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
                  <Filter className="h-3 w-3 text-muted-foreground" />
                  <select
                    value={selectedCollegeId}
                    onChange={(e) => setSelectedCollegeId(e.target.value)}
                    className="border-0 bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer appearance-none"
                  >
                    <option value="all" className="bg-card">All Departments</option>
                    {colleges.map(c => (
                      <option key={c.id} value={c.id.toString()} className="bg-card">{c.name}</option>
                    ))}
                  </select>
                </div>
                {selectedCollegeId !== "all" && (
                  <button onClick={() => setSelectedCollegeId("all")} className="text-muted-foreground hover:text-primary">
                    <X className="h-3 w-3" />
                  </button>
                )}
                <Button onClick={openSubjectCreate} className="h-8 rounded-lg font-bold shadow-sm">
                  <BookOpen className="mr-2 h-3 w-3" />
                  Create
                </Button>
              </div>
            </div>
          </div>

          {/* Subjects Content */}
          <div className="grid grid-cols-1 gap-6">
            {loading ? (
              <div className="grid gap-6">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-80 w-full rounded-2xl" />)}
              </div>
            ) : filteredSubjects.length ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {filteredSubjects.map((item) => (
                  <div
                    key={item.id}
                    data-subject-id={item.id}
                    className="group relative flex flex-col min-h-[20rem] overflow-visible rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-md hover:border-primary/25 transition-all duration-300 hover:ring-2 hover:ring-primary/20 cursor-pointer"
                    onClick={() => { setDetailSubject(item); setSubjectDetailModalOpen(true); }}
                  >
                    {/* Image Section */}
                    <div className="relative h-44 overflow-hidden rounded-t-2xl bg-muted">
                      <img
                        src={item.cover_image_url || "/background.png"}
                        alt={item.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 dark:bg-gradient-to-t dark:from-background/90 dark:via-background/25 dark:to-transparent" />

                      {item.code && (
                        <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-white/90 backdrop-blur-sm border border-white/20 px-3 py-1.5 shadow-lg">
                          <GraduationCap className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-semibold text-gray-800">{item.code}</span>
                        </div>
                      )}

                      {/* Top Actions */}
                      <div className="absolute right-4 top-4 z-30" data-actions-menu>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9 rounded-xl border-border/60 bg-background/60 text-foreground backdrop-blur-md hover:bg-background/85 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenSubjectMenuId((prev) => (prev === item.id ? null : item.id));
                            setOpenSectionMenuId(null);
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        {openSubjectMenuId === item.id ? (
                          <div className="absolute right-0 top-11 z-[70] w-44 rounded-xl border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in duration-200">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-accent transition-colors"
                              onClick={() => {
                                setOpenSubjectMenuId(null);
                                openSubjectEdit(item);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit Details
                            </button>
                            <button
                              type="button"
                              className="flex pill w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-bold text-danger hover:bg-danger/10 transition-colors"
                              onClick={() => {
                                setOpenSubjectMenuId(null);
                                setActiveSubject(item);
                                setSubjectDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete Subject
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Subject Name Below Image */}
                    <div className="p-3 pb-2">
                      <h3 className="text-lg md:text-xl font-bold text-foreground tracking-tight leading-tight mb-2">
                        {item.name}
                      </h3>
                      {/* College Below Name */}
                      {item.college_name && (() => {
                        const college = colleges.find(c => c.id === item.college_id);
                        return college?.logo_path ? (
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-5 w-5 flex items-center justify-center rounded-[50%] border-2 border-gray-300 bg-white p-0.5">
                              <img
                                src={college.logo_path}
                                alt={item.college_name}
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <span className="text-sm font-semibold text-foreground">{item.college_name}</span>
                          </div>
                        ) : null;
                      })()}
                    </div>

                    <div className="flex-1 p-4 flex flex-col gap-3">
                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/15 px-3 py-2 text-primary">
                          <Users className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-wider">
                            {item.sections_count} Section{item.sections_count === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>

                      {/* Subject Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.25rem]">
                        {item.description || "No description provided for this subject."}
                      </p>

                      {/* Sections summary hint */}
                      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border/40">
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                          Click to view sections
                        </span>
                        {(() => {
                          const unassignedCount = (sectionsBySubject.get(item.id) ?? []).filter(isSectionUnassigned).length;
                          return unassignedCount > 0 ? (
                            <div className="ml-auto flex items-center gap-1 rounded-md bg-warning/10 border border-warning/20 px-1.5 py-0.5">
                              <AlertTriangle className="h-2.5 w-2.5 text-warning" />
                              <span className="text-[9px] font-black text-warning">{unassignedCount} unassigned</span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-96 flex flex-col items-center justify-center text-center rounded-3xl border border-dashed border-border bg-card/50">
                <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-black text-foreground px-10">No subjects matches your search</h3>
                <p className="text-sm text-muted-foreground mt-1">Try refining your search terms.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-12 xl:col-span-4 space-y-6 xl:sticky xl:top-24">
          {/* Class Sections Header and Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <div>
                  <h2 className="text-lg font-bold text-foreground">Class Sections</h2>
                  <p className="text-sm text-muted-foreground">Available sections to assign</p>
                </div>
              </div>
              <Badge tone="default" className="bg-background/50">{poolSectionCards.length}</Badge>
            </div>

            {/* Class Sections Search Bar */}
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search sections..."
                value={poolQuery}
                onChange={(e) => setPoolQuery(e.target.value)}
                className="h-6 border-0 bg-transparent px-1 text-xs focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
              />
            </div>

            {/* Class Sections Filters */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-2 py-1.5 flex-1">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <select
                  value={poolSortBy === "college" ? poolSelectedCollegeId : "all"}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "all") {
                      setPoolSelectedCollegeId("all");
                      setPoolSortBy("name");
                    } else {
                      setPoolSelectedCollegeId(value);
                      setPoolSortBy("college");
                    }
                  }}
                  className="border-0 bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer appearance-none flex-1"
                >
                  <option value="all" className="bg-card text-foreground">All Colleges</option>
                  {colleges.map(c => (
                    <option key={c.id} value={c.id.toString()} className="bg-card text-foreground">{c.name}</option>
                  ))}
                </select>
              </div>
              {poolSortBy === "college" && poolSelectedCollegeId !== "all" && (
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-2 py-1.5">
                  <GraduationCap className="h-3 w-3 text-muted-foreground" />
                  <select
                    value={poolSelectedMajorId}
                    onChange={(e) => setPoolSelectedMajorId(e.target.value)}
                    className="border-0 bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer appearance-none"
                  >
                    <option value="all" className="bg-card text-foreground">All Majors</option>
                    {poolMajors.filter(m => m.college_id.toString() === poolSelectedCollegeId).map(m => (
                      <option key={m.id} value={m.id.toString()} className="bg-card text-foreground">{m.code}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* New Section Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={openSectionCreate}
              className="w-full h-8 rounded-lg border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 text-xs"
            >
              <PlusCircle className="mr-2 h-3 w-3" />
              New Section
            </Button>
          </div>

          {/* Class Sections Card */}
          <Card className="border-primary/10 bg-primary/[0.02] backdrop-blur-sm overflow-hidden rounded-2xl">
            <CardContent className="p-3">
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {poolSectionCards.length === 0 ? (
                  <div className="p-6 text-center rounded-xl border border-dashed border-border">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Empty Pool</p>
                  </div>
                ) : (
                  poolSectionCards.map((ps) => (
                    <div
                      key={ps.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setActivePoolSectionKey(ps.key);
                        setSectionInfoModalOpen(true);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setActivePoolSectionKey(ps.key);
                          setSectionInfoModalOpen(true);
                        }
                      }}
                      className="group/pool flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-card p-3 transition-all hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover/pool:bg-primary group-hover/pool:text-white transition-colors overflow-hidden">
                        {ps.college_logo_path ? (
                          <img
                            src={ps.college_logo_path}
                            alt={ps.college_name ?? ps.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <Users className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-foreground truncate">{ps.name}</p>
                      </div>
                      <Badge tone="default" className="text-[9px] bg-muted/30 shrink-0">
                        {ps.subject_names.length} Subj
                      </Badge>
                    </div>
                  ))
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4 h-9 rounded-xl border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50"
                onClick={openSectionCreate}
              >
                <PlusCircle className="mr-2 h-3.5 w-3.5" />
                New Pool Section
              </Button>
            </CardContent>
          </Card>

          <Card className="border-warning/30 bg-warning/5 rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-warning/10">
              <button
                type="button"
                onClick={() => setUnassignedOpen((prev) => !prev)}
                className="w-full flex items-center justify-between transition-colors"
              >
                <CardTitle className="text-sm font-black flex items-center gap-2">
                  <Users className="h-4 w-4 text-warning" />
                  UNASSIGNED
                  <Badge tone={unassignedSections.length > 0 ? "warning" : "success"} className="ml-auto">{unassignedSections.length}</Badge>
                </CardTitle>
                {unassignedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </CardHeader>
            {unassignedOpen ? (
              <CardContent className="p-4 space-y-3">
                {unassignedSections.length === 0 ? (
                  <p className="text-[10px] font-bold text-muted-foreground uppercase text-center py-4">All assigned</p>
                ) : (
                  unassignedSections.map((section) => (
                    <div
                      key={section.id}
                      className="flex flex-col gap-2 rounded-xl border border-warning/40 bg-background/50 p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-wide text-muted-foreground truncate">
                          {section.subject_name}
                        </p>
                        <p className="text-xs font-black text-foreground truncate">
                          {section.name}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-full text-[10px] font-black uppercase border-warning/40 text-warning hover:bg-warning/5"
                        onClick={() => {
                          setAssigningSection(section);
                          setSelectedTeacherId(section.teacher_id);
                          setAssignModalOpen(true);
                        }}
                      >
                        Assign Teacher
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            ) : null}
          </Card>
        </div>
      </div>

      <Modal
        open={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        title={subjectModalMode === "create" ? (subjectStep === 1 ? "Select Owning College" : "New Subject") : "Edit Subject"}
        description={subjectModalMode === "create" ? (subjectStep === 1 ? "Start by choosing the college that owns this subject (or pick Global)." : "Create a new subject for the academic repository.") : "Modify the subject details."}
      >
        {subjectModalMode === "create" && subjectStep === 1 ? (
          <div className="grid grid-cols-2 gap-3 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <button
              type="button"
              className="group flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-lg transition-all"
              onClick={() => {
                setSubjectCollegeId("all");
                setSubjectStep(2);
              }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors overflow-hidden border-2 border-transparent group-hover:border-primary/20">
                <Globe className="h-7 w-7 text-primary" />
              </div>
              <span className="text-[10px] font-black text-foreground text-center line-clamp-2 uppercase tracking-tighter max-w-[120px]">
                Global / Any College
              </span>
            </button>
            {colleges.map((college) => (
              <button
                key={college.id}
                type="button"
                className="group flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-lg transition-all"
                onClick={() => {
                  setSubjectCollegeId(college.id.toString());
                  setSubjectStep(2);
                }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors overflow-hidden border-2 border-transparent group-hover:border-primary/20">
                  {college.logo_path ? (
                    <img
                      src={college.logo_path}
                      alt={college.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <GraduationCap className="h-7 w-7 text-primary" />
                  )}
                </div>
                <span className="text-[10px] font-black text-foreground text-center line-clamp-2 uppercase tracking-tighter max-w-[120px]">
                  {college.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubjectSubmit}>
            <div className="space-y-3 pt-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Subject Information</label>
              <Input placeholder="Subject name (e.g. Advanced Networking)" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} required />
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Code (optional)" value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} />
                <Input placeholder="Description (optional)" value={subjectDescription} onChange={(e) => setSubjectDescription(e.target.value)} />
              </div>
              <select
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={subjectCollegeId}
                onChange={(e) => setSubjectCollegeId(e.target.value)}
              >
                <option value="all">Global / Any College</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.id.toString()}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 rounded-xl border border-border/70 bg-background p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subject Cover Image</p>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => onSubjectCoverChange(e.target.files?.[0] ?? null)}
                className="text-xs"
              />
              {subjectCoverPreview && (
                <div className="overflow-hidden rounded-lg mt-2 border border-border/60">
                  <img src={subjectCoverPreview} alt="Subject cover preview" className="h-24 w-full object-cover" />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {subjectModalMode === "create" && (
                <Button variant="outline" type="button" onClick={() => setSubjectStep(1)} className="mr-auto">Back</Button>
              )}
              <Button variant="outline" type="button" onClick={() => setSubjectModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={uploadingSubjectCover}>
                {uploadingSubjectCover ? "Uploading image..." : "Save Subject"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={sectionModalOpen}
        onClose={() => setSectionModalOpen(false)}
        title={sectionModalMode === "create" ? (creationStep === 1 ? "Select College" : "Section Details") : "Edit Section"}
        description={sectionModalMode === "create" ? (creationStep === 1 ? "Start by choosing the college for this section." : "Define the major, year, and subject assignments.") : "Modify the section details."}
      >
        {sectionModalMode === "create" && creationStep === 1 ? (
          <div className="grid grid-cols-2 gap-3 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {colleges.map((college) => (
              <button
                key={college.id}
                type="button"
                className="group flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-lg transition-all"
                onClick={() => {
                  setSelectedCollegeId(college.id.toString());
                  loadMajorsData(college.id);
                  setCreationStep(2);
                }}
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors overflow-hidden border-2 border-transparent group-hover:border-primary/20">
                  {college.logo_path ? (
                    <img
                      src={college.logo_path}
                      alt={college.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <GraduationCap className="h-10 w-10 text-primary" />
                  )}
                </div>
                <span className="text-[10px] font-black text-foreground text-center line-clamp-2 uppercase tracking-tighter max-w-[120px]">
                  {college.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSectionSubmit}>
            {sectionModalMode === "create" && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Major / Program</label>
                  <select
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    value={selectedMajorId ?? ""}
                    onChange={(e) => setSelectedMajorId(e.target.value)}
                    disabled={processing}
                  >
                    {majors.map((major) => (
                      <option key={major.id} value={major.id}>{major.name} ({major.code})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Year Level</label>
                    <select
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={yearLevel}
                      onChange={(e) => setYearLevel(e.target.value)}
                    >
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                      <option value="5">5th Year</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Section</label>
                    <Input
                      placeholder="e.g. A"
                      value={sectionLetter}
                      onChange={(e) => setSectionLetter(e.target.value.toUpperCase())}
                      className="h-10 rounded-xl"
                      maxLength={1}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Auto-Generated Code:</span>
                  <span className="text-lg font-black text-primary tracking-tight">
                    {majors.find(m => m.id.toString() === selectedMajorId)?.code || "MAJOR"}-{yearLevel}{sectionLetter}
                  </span>
                </div>
              </>
            )}

            {sectionModalMode === "edit" && (
              <Input placeholder="Section name" value={sectionName} onChange={(e) => setSectionName(e.target.value)} required />
            )}

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground block mb-2">
                Subject Assignment(s) <span className="text-muted-foreground/60 font-normal">(Optional)</span>
              </label>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background px-2 py-1.5 w-full">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filter subjects by name or code..."
                    value={sectionSubjectFilterQuery}
                    onChange={(e) => setSectionSubjectFilterQuery(e.target.value)}
                    className="h-7 border-0 bg-transparent px-1 text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 rounded-xl border border-border bg-muted/20">
                {filteredSubjectsForAssignment.map((subject) => (
                  <label key={subject.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-background transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      checked={sectionSubjectIds.includes(subject.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSectionSubjectIds([...sectionSubjectIds, subject.id]);
                        } else {
                          setSectionSubjectIds(sectionSubjectIds.filter(id => id !== subject.id));
                        }
                      }}
                    />
                    <span className="text-xs font-bold truncate">{subject.name}</span>
                  </label>
                ))}
                {filteredSubjectsForAssignment.length === 0 && (
                  <p className="col-span-2 text-[11px] text-muted-foreground italic">
                    No subjects match the current filters.
                  </p>
                )}
              </div>
              {sectionSubjectIds.length === 0 && (
                <p className="text-xs text-muted-foreground italic mt-2">
                  No subjects selected. Section will be created without subject assignments.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {sectionModalMode === "create" && (
                <Button variant="outline" type="button" onClick={() => setCreationStep(1)}>Back</Button>
              )}
              <Button variant="outline" type="button" onClick={() => setSectionModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Section</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        title="Quick Create"
        description="Select subject and create sections for a new course."
      >
        <form className="space-y-4" onSubmit={onClassCreateSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select College</label>
            <select
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              value={selectedCollegeId ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedCollegeId(id);
                if (id !== "all" && id !== "") {
                  loadMajorsData(parseInt(id));
                }
              }}
              required
            >
              <option value="">Select College...</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Major / Program</label>
            <select
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              value={selectedMajorId ?? ""}
              onChange={(e) => setSelectedMajorId(e.target.value)}
              disabled={selectedCollegeId === "all" || selectedCollegeId === "" || processing}
              required
            >
              {majors.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Year & Section</label>
              <div className="flex gap-2">
                <select
                  className="h-10 w-20 rounded-xl border border-border bg-background px-2 text-sm"
                  value={yearLevel}
                  onChange={(e) => setYearLevel(e.target.value)}
                >
                  {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <Input
                  className="h-10 flex-1 rounded-xl"
                  placeholder="Section"
                  value={sectionLetter}
                  onChange={(e) => setSectionLetter(e.target.value.toUpperCase())}
                  maxLength={1}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Subject</label>
              <select
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                value={newClassSubjectId ?? ""}
                onChange={(e) => setNewClassSubjectId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">+ New Subject</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>
          </div>

          {!newClassSubjectId && (
            <div className="space-y-3 p-3 rounded-xl border border-border bg-muted/20">
              <Input
                placeholder="New subject name"
                value={newClassSubjectName}
                onChange={(e) => setNewClassSubjectName(e.target.value)}
                required
              />
              <Input
                placeholder="New subject code (optional)"
                value={newClassSubjectCode}
                onChange={(e) => setNewClassSubjectCode(e.target.value)}
              />
            </div>
          )}

          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Generated Class Code:</span>
            <span className="text-lg font-black text-primary">
              {majors.find(m => m.id.toString() === selectedMajorId)?.code || "MAJOR"}-{yearLevel}{sectionLetter}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setClassModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Course</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Section To Teacher"
        description={assigningSection ? `${assigningSection.subject_name} - ${assigningSection.name}` : ""}
      >
        <div className="space-y-4 pt-1">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Select Teacher</label>
          <TeacherSelect
            teachers={teachers}
            value={selectedTeacherId}
            onChange={(id) => setSelectedTeacherId(id)}
            placeholder="Search and select a teacher..."
          />
          <button
            type="button"
            className="text-xs font-semibold text-warning hover:underline"
            onClick={onSetSectionUnassigned}
          >
            Leave unassigned (no teacher yet)
          </button>
          <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setAssignModalOpen(false)} className="h-10 px-6 font-medium">Cancel</Button>
            <Button onClick={onAssignConfirm} disabled={!selectedTeacherId} className="h-10 px-8 font-bold">Confirm Assignment</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={subjectDeleteModalOpen}
        onClose={() => setSubjectDeleteModalOpen(false)}
        title="Delete Subject"
        description={activeSubject ? `Delete ${activeSubject.name}? This cannot be undone.` : ""}
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setSubjectDeleteModalOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { if (!activeSubject) return; onDeleteSubject(activeSubject); }}>Delete</Button>
        </div>
      </Modal>

      <Modal
        open={sectionDeleteModalOpen}
        onClose={() => setSectionDeleteModalOpen(false)}
        title="Delete Section"
        description={activeSection ? `Delete ${activeSection.subject_name} - ${activeSection.name}? This cannot be undone.` : ""}
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setSectionDeleteModalOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { if (!activeSection) return; onDeleteSection(activeSection); }}>Delete</Button>
        </div>
      </Modal>

      <Modal
        open={dropConfirmOpen}
        onClose={() => { setDropConfirmOpen(false); setPendingDrop(null); }}
        title="College Mismatch"
        description={pendingDrop ? `"${pendingDrop.sectionName}" belongs to a different college than "${pendingDrop.subject.name}" (${pendingDrop.subject.college_name ?? "Unknown College"}). Are you sure you want to link this section to a cross-college subject?` : ""}
      >
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 mb-4 flex gap-3 items-start">
          <span className="text-warning text-lg">⚠️</span>
          <div>
            <p className="text-xs font-black text-warning uppercase tracking-wider mb-1">Cross-College Assignment</p>
            <p className="text-xs text-muted-foreground">This section&apos;s college may differ from the subject&apos;s owning college. This is allowed but unusual. Consider verifying before proceeding.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setDropConfirmOpen(false); setPendingDrop(null); }}>Cancel</Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!pendingDrop) return;
              setDropConfirmOpen(false);
              await doLinkSection(pendingDrop.sectionName, pendingDrop.subject.id);
              setPendingDrop(null);
            }}
          >
            Yes, Link Anyway
          </Button>
        </div>
      </Modal>

      {/* Subject Detail Modal */}
      <Modal
        open={subjectDetailModalOpen}
        onClose={() => {
          setSubjectDetailModalOpen(false);
          setDetailSubject(null);
          setOpenSectionMenuId(null);
          setSubjectSectionModalOpen(false);
          setSubjectSectionQuery("");
          setSelectedSubjectSectionId(null);
          setSubjectSectionCollegeMenuOpen(false);
        }}
        title={detailSubject?.name ?? ""}
        description={
          [detailSubject?.code && `Code: ${detailSubject.code}`, detailSubject?.college_name]
            .filter(Boolean).join(" - ") || "Subject Details"
        }
      >
        {detailSubject && (() => {
          const subjectSections = sectionsBySubject.get(detailSubject.id) ?? [];
          const unassignedCount = subjectSections.filter(isSectionUnassigned).length;
          const college = colleges.find(c => c.id === detailSubject.college_id);
          return (
            <div className="space-y-4">
              {/* Cover Image */}
              <div className="relative h-36 rounded-xl overflow-hidden bg-muted">
                <img
                  src={detailSubject.cover_image_url || "/background.png"}
                  alt={detailSubject.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 dark:bg-gradient-to-t dark:from-background/60 dark:to-transparent" />
                {detailSubject.code && (
                  <div className="absolute bottom-3 left-3">
                    <span className="flex items-center gap-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-white/20 px-2.5 py-1 text-sm font-semibold text-gray-800 shadow">
                      <GraduationCap className="h-3.5 w-3.5 text-purple-600" />
                      {detailSubject.code}
                    </span>
                  </div>
                )}
              </div>

              {/* College info */}
              {detailSubject.college_name && (
                <div className="flex items-center gap-2">
                  {college?.logo_path && (
                    <div className="h-6 w-6 flex items-center justify-center rounded-full border-2 border-gray-200 bg-white p-0.5 shrink-0">
                      <img src={college.logo_path} alt={detailSubject.college_name} className="h-full w-full object-contain" />
                    </div>
                  )}
                  <span className="text-sm font-semibold text-foreground">{detailSubject.college_name}</span>
                </div>
              )}

              {/* Description */}
              {detailSubject.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{detailSubject.description}</p>
              )}

              {/* Sections header */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-black text-foreground">Sections</span>
                  <Badge className="text-[10px]">{subjectSections.length}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {unassignedCount > 0 && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-warning/10 border border-warning/20 px-2.5 py-1">
                      <AlertTriangle className="h-3 w-3 text-warning" />
                      <span className="text-[10px] font-black text-warning uppercase tracking-wide">
                        {unassignedCount} Unassigned
                      </span>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-lg border-primary/30 text-primary hover:bg-primary/5 text-[10px] font-black uppercase"
                    onClick={openAddSectionForSubject}
                  >
                    <PlusCircle className="mr-1 h-3 w-3" />
                    Add Section
                  </Button>
                </div>
              </div>

              {/* Sections list */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {subjectSections.length === 0 ? (
                  <div className="py-8 text-center rounded-xl border border-dashed border-border/60">
                    <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No Sections Assigned</p>
                  </div>
                ) : (
                  subjectSections.map((section) => {
                    const isUnassigned = isSectionUnassigned(section);
                    return (
                      <div
                        key={section.id}
                        className={cn(
                          "flex items-center justify-between gap-3 p-3 rounded-xl border transition-all",
                          isUnassigned
                            ? "border-warning/40 bg-warning/5"
                            : "border-border/50 bg-muted/20"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-black text-foreground truncate">{section.name}</p>
                            {isUnassigned && <Badge tone="warning" className="text-[9px] shrink-0">Unassigned</Badge>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-[7px] font-bold text-primary">
                                {teacherLabel(section).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className={cn("text-[10px] font-bold truncate", isUnassigned ? "text-warning" : "text-muted-foreground")}>
                              {!isUnassigned && currentActorUserId !== null && section.teacher_id === currentActorUserId
                                ? "You"
                                : teacherLabel(section)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isUnassigned && canAssignSectionTeacher(section) && (
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-[10px] font-black bg-warning text-warning-foreground hover:bg-warning/90 rounded-lg"
                              onClick={() => {
                                setAssigningSection(section);
                                setSelectedTeacherId(null);
                                setAssignModalOpen(true);
                              }}
                            >
                              <UserPlus className="mr-1 h-3 w-3" />
                              Assign
                            </Button>
                          )}
                          <div className="relative" data-actions-menu>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-lg hover:bg-muted"
                              onClick={() => setOpenSectionMenuId((prev) => (prev === section.id ? null : section.id))}
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                            {openSectionMenuId === section.id && (
                              <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-border bg-card p-1.5 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-1">
                                {!isUnassigned && canAssignSectionTeacher(section) && (
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-bold hover:bg-accent transition-colors text-primary"
                                    onClick={() => {
                                      setOpenSectionMenuId(null);
                                      setAssigningSection(section);
                                      setSelectedTeacherId(section.teacher_id);
                                      setAssignModalOpen(true);
                                    }}
                                  >
                                    <UserPlus className="h-3 w-3" />
                                    Reassign Teacher
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-bold hover:bg-accent transition-colors"
                                  onClick={() => {
                                    setOpenSectionMenuId(null);
                                    openSectionEdit(section);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                  Edit Section
                                </button>
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-bold text-danger hover:bg-danger/10 transition-colors"
                                  onClick={() => {
                                    setOpenSectionMenuId(null);
                                    setActiveSection(section);
                                    setSectionDeleteModalOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete Section
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal
        open={subjectSectionModalOpen}
        onClose={() => {
          setSubjectSectionModalOpen(false);
          setSubjectSectionQuery("");
          setSelectedSubjectSectionId(null);
          setSubjectSectionCollegeMenuOpen(false);
        }}
        title="Add Section"
        description={detailSubject ? `Attach an existing section to ${detailSubject.name}.` : "Attach an existing section."}
      >
        <form className="space-y-4" onSubmit={onAddSectionForSubjectSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative" data-subject-section-college-menu>
              <button
                type="button"
                onClick={() => setSubjectSectionCollegeMenuOpen((prev) => !prev)}
                className="flex h-10 w-full items-center gap-2 rounded-xl border border-border/70 bg-background px-2 py-1.5"
              >
                <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-border/70 bg-muted/20">
                  {selectedSubjectSectionCollege?.logo_path ? (
                    <img
                      src={selectedSubjectSectionCollege.logo_path}
                      alt={selectedSubjectSectionCollege.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <span className="flex-1 truncate text-left text-xs font-bold text-foreground">
                  {selectedSubjectSectionCollege?.name ?? "All Colleges"}
                </span>
                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", subjectSectionCollegeMenuOpen && "rotate-180")} />
              </button>
              {subjectSectionCollegeMenuOpen && (
                <div className="absolute left-0 right-0 top-11 z-30 max-h-64 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl">
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold hover:bg-accent",
                      subjectSectionCollegeId === "all" && "bg-accent"
                    )}
                    onClick={() => {
                      setSubjectSectionCollegeId("all");
                      setSubjectSectionMajorId("all");
                      setSubjectSectionCollegeMenuOpen(false);
                    }}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-muted/20">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                    </div>
                    All Colleges
                  </button>
                  {colleges.map((college) => (
                    <button
                      key={college.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold hover:bg-accent",
                        subjectSectionCollegeId === college.id.toString() && "bg-accent"
                      )}
                      onClick={() => {
                        setSubjectSectionCollegeId(college.id.toString());
                        setSubjectSectionMajorId("all");
                        setSubjectSectionCollegeMenuOpen(false);
                      }}
                    >
                      <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-border/70 bg-muted/20">
                        {college.logo_path ? (
                          <img src={college.logo_path} alt={college.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <GraduationCap className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="truncate">{college.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background px-2 py-1.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/20">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <select
                value={subjectSectionMajorId}
                onChange={(e) => setSubjectSectionMajorId(e.target.value)}
                className="h-8 w-full appearance-none border-0 bg-transparent px-1 text-xs font-bold text-foreground outline-none disabled:text-muted-foreground"
                disabled={subjectSectionCollegeId === "all"}
              >
                <option value="all" className="bg-card text-foreground">All Majors</option>
                {subjectSectionMajors.map((major) => (
                  <option key={major.id} value={major.id.toString()} className="bg-card text-foreground">
                    {major.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            placeholder="Search existing sections..."
            value={subjectSectionQuery}
            onChange={(e) => setSubjectSectionQuery(e.target.value)}
          />

          <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-border bg-muted/20 p-2">
            {addableSectionsForSubject.length === 0 ? (
              <p className="p-4 text-center text-xs text-muted-foreground">
                No available sections for the current filters.
              </p>
            ) : (
              addableSectionsForSubject.map((poolSection) => {
                const major = poolSection.major_id ? majorById.get(poolSection.major_id) : undefined;
                const college = major ? colleges.find((item) => item.id === major.college_id) : undefined;
                const selected = selectedSubjectSectionId === poolSection.id;
                return (
                  <button
                    key={poolSection.id}
                    type="button"
                    onClick={() => setSelectedSubjectSectionId(poolSection.id)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border/60 bg-background hover:border-primary/40"
                    )}
                  >
                    <p className="text-sm font-bold text-foreground">{poolSection.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {college?.name ?? "Unknown College"} {major ? `- ${major.code}` : ""}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSubjectSectionModalOpen(false);
                setSubjectSectionQuery("");
                setSelectedSubjectSectionId(null);
                setSubjectSectionCollegeMenuOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={linkingSubjectSection || !selectedSubjectSectionId}>
              {linkingSubjectSection ? "Adding..." : "Add Section"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={sectionInfoModalOpen}
        onClose={() => {
          setSectionInfoModalOpen(false);
          setActivePoolSectionKey(null);
        }}
        title={activePoolSection?.name ?? "Section Info"}
        description={
          activePoolSection
            ? [activePoolSection.college_name, activePoolSection.major_name]
                .filter(Boolean)
                .join(" - ") || "Section details"
            : "Section details"
        }
        className={activePoolSection && activePoolSection.subject_names.length > 6 ? "max-w-3xl" : "max-w-2xl"}
      >
        {activePoolSection ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Section</p>
                <p className="mt-1 text-sm font-bold text-foreground">{activePoolSection.name}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Subjects</p>
                <p className="mt-1 text-sm font-bold text-foreground">{activePoolSection.subject_names.length}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Year / Section</p>
                <p className="mt-1 text-sm font-bold text-foreground">
                  {activePoolSection.year_level ?? "-"}{activePoolSection.section_letter ?? ""}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-background p-3">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">Subjects</p>
              {activePoolSection.subject_names.length === 0 ? (
                <p className="text-xs text-muted-foreground">No subjects assigned yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activePoolSection.subject_names.map((subjectName) => (
                    <Badge key={subjectName} tone="default" className="bg-primary/10 text-primary">
                      {subjectName}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border/70 bg-background p-3">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">Assignments</p>
              {activePoolSection.assignments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No teacher assignments yet.</p>
              ) : (
                <div className={cn("space-y-2", activePoolSection.assignments.length > 8 && "max-h-80 overflow-y-auto pr-1")}>
                  {activePoolSection.assignments.map((assignment, index) => (
                    <div key={`${assignment.subject_name}-${assignment.teacher_name}-${index}`} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                      <span className="text-xs font-bold text-foreground truncate">{assignment.subject_name}</span>
                      <span className="text-[11px] font-semibold text-muted-foreground truncate">{assignment.teacher_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Section not found.</p>
        )}
      </Modal>

    </div>
  );
}
  

