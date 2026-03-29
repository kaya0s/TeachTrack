"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Building2, GraduationCap, ImagePlus, Pencil, PlusCircle, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CriticalActionModal } from "@/components/ui/critical-action-modal";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { AcademicFilterBar } from "@/features/admin/components/academic-filter-bar";
import { useAcademicFilters } from "@/features/admin/hooks/use-academic-filters";
import { useAcademicHierarchyOptions } from "@/features/admin/hooks/use-academic-hierarchy-options";
import {
  assignSectionTeacher,
  createSubject,
  deleteSubject,
  getSections,
  getSubjects,
  getTeachers,
  unassignSectionTeacher,
  updateSection,
  updateSubject,
  uploadAdminMedia,
} from "@/features/admin/api";
import type { AdminMajor, AdminSection, AdminSubject, AdminTeacher } from "@/features/admin/types";
import { getErrorMessage } from "@/lib/errors";

type SubjectForm = {
  name: string;
  code: string;
  description: string;
  major_id: number | null;
  cover_image_url: string;
};

const INITIAL_FORM: SubjectForm = {
  name: "",
  code: "",
  description: "",
  major_id: null,
  cover_image_url: "",
};

type SubjectSectionAssignment = {
  section_id: number;
  section_name: string;
  major_id: number | null;
  department_id: number | null;
  teacher_id: number | null;
  teacher_name: string;
};

export default function SubjectsPage() {
  const { notify } = useToast();
  const { filters, setFilters, clearFilter, clearAll } = useAcademicFilters();
  const { colleges, departments, majors } = useAcademicHierarchyOptions(filters);

  const [items, setItems] = useState<AdminSubject[]>([]);
  const [sectionRows, setSectionRows] = useState<AdminSection[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<SubjectForm>(INITIAL_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [active, setActive] = useState<AdminSubject | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminSubject | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [uploadingCover, setUploadingCover] = useState(false);
  const [assignmentBusyKey, setAssignmentBusyKey] = useState<string | null>(null);
  const [draftTeacherBySection, setDraftTeacherBySection] = useState<Record<number, string>>({});
  const [linkSectionId, setLinkSectionId] = useState<string>("");
  const [linkTeacherId, setLinkTeacherId] = useState<string>("");
  const [sectionMajorFilter, setSectionMajorFilter] = useState<string>("context");
  const [teacherDepartmentFilter, setTeacherDepartmentFilter] = useState<string>("context");

  const majorOptions = useMemo(() => {
    if (majors.length > 0) return majors;
    return [] as AdminMajor[];
  }, [majors]);

  const assignmentsBySubject = useMemo(() => {
    const map = new Map<number, SubjectSectionAssignment[]>();
    for (const row of sectionRows) {
      if (row.subject_id === null) continue;
      const existing = map.get(row.subject_id) ?? [];
      const duplicate = existing.some((entry) => entry.section_id === row.id);
      if (duplicate) continue;
      existing.push({
        section_id: row.id,
        section_name: row.name,
        major_id: row.major_id ?? null,
        department_id: row.department_id ?? null,
        teacher_id: row.teacher_id ?? null,
        teacher_name: row.teacher_fullname?.trim() || row.teacher_username,
      });
      map.set(row.subject_id, existing);
    }
    return map;
  }, [sectionRows]);

  const sectionCatalog = useMemo(() => {
    const map = new Map<number, { id: number; name: string; major_id: number | null; major_name: string | null; department_id: number | null }>();
    for (const row of sectionRows) {
      if (!map.has(row.id)) {
        map.set(row.id, {
          id: row.id,
          name: row.name,
          major_id: row.major_id ?? null,
          major_name: row.major_name ?? null,
          department_id: row.department_id ?? null,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [sectionRows]);

  const sectionMajorOptions = useMemo(() => {
    const ids = new Set<number>();
    for (const section of sectionCatalog) {
      if (section.major_id !== null) ids.add(section.major_id);
    }
    return majorOptions
      .filter((major) => ids.has(major.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [majorOptions, sectionCatalog]);

  const teacherDepartmentOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const teacher of teachers) {
      if (teacher.department_id === null) continue;
      if (!map.has(teacher.department_id)) {
        map.set(teacher.department_id, teacher.department_name ?? `Department ${teacher.department_id}`);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teachers]);

  const activeAssignments = useMemo(
    () => (active ? assignmentsBySubject.get(active.id) ?? [] : []),
    [active, assignmentsBySubject],
  );

  const availableSectionsForActive = useMemo(() => {
    if (!active) return [];
    const linked = new Set(activeAssignments.map((assignment) => assignment.section_id));
    const unlinked = sectionCatalog.filter((row) => !linked.has(row.id));
    let majorId: number | null = null;
    if (sectionMajorFilter === "context") {
      majorId = active.major_id ?? null;
    } else if (sectionMajorFilter !== "all") {
      const parsed = Number(sectionMajorFilter);
      majorId = Number.isFinite(parsed) ? parsed : null;
    }
    const scoped = majorId !== null ? unlinked.filter((row) => row.major_id === majorId) : unlinked;
    if (scoped.length === 0 && sectionMajorFilter === "context") {
      return unlinked;
    }
    return scoped;
  }, [active, activeAssignments, sectionCatalog, sectionMajorFilter]);

  const selectedSectionForLink = useMemo(
    () => (linkSectionId ? sectionCatalog.find((section) => section.id === Number(linkSectionId)) ?? null : null),
    [linkSectionId, sectionCatalog],
  );

  const teacherOptionsForLink = useMemo(() => {
    let departmentId: number | null = null;
    if (teacherDepartmentFilter === "context") {
      departmentId = selectedSectionForLink?.department_id ?? active?.department_id ?? null;
    } else if (teacherDepartmentFilter !== "all") {
      const parsed = Number(teacherDepartmentFilter);
      departmentId = Number.isFinite(parsed) ? parsed : null;
    }
    return departmentId !== null
      ? teachers.filter((teacher) => teacher.department_id === departmentId)
      : teachers;
  }, [active?.department_id, selectedSectionForLink?.department_id, teacherDepartmentFilter, teachers]);

  function openDetails(row: AdminSubject) {
    setActive(row);
    setDetailsOpen(true);
    setLinkSectionId("");
    setLinkTeacherId("");
    setSectionMajorFilter("context");
    setTeacherDepartmentFilter("context");
    const draft: Record<number, string> = {};
    const subjectAssignments = assignmentsBySubject.get(row.id) ?? [];
    for (const assignment of subjectAssignments) {
      draft[assignment.section_id] = assignment.teacher_id ? String(assignment.teacher_id) : "";
    }
    setDraftTeacherBySection(draft);
  }

  const load = useCallback(async (): Promise<{ subjects: AdminSubject[]; sections: AdminSection[] }> => {
    setLoading(true);
    try {
      const params: string[] = ["limit=1000"];
      if (query.trim()) params.push(`q=${encodeURIComponent(query.trim())}`);
      if (filters.college_id) params.push(`college_id=${filters.college_id}`);
      if (filters.department_id) params.push(`department_id=${filters.department_id}`);
      if (filters.major_id) params.push(`major_id=${filters.major_id}`);

      const sectionParams: string[] = ["limit=1200"];
      if (filters.college_id) sectionParams.push(`college_id=${filters.college_id}`);
      if (filters.department_id) sectionParams.push(`department_id=${filters.department_id}`);
      if (filters.major_id) sectionParams.push(`major_id=${filters.major_id}`);

      const [subjectsRes, sectionsRes, teachersRes] = await Promise.all([
        getSubjects(`?${params.join("&")}`),
        getSections(`?${sectionParams.join("&")}`),
        getTeachers("?limit=500"),
      ]);
      const subjectRows = subjectsRes.items ?? [];
      const sectionAssignmentRows = sectionsRes.items ?? [];
      setItems(subjectRows);
      setSectionRows(sectionAssignmentRows);
      setTeachers((teachersRes.items ?? []).filter((teacher: AdminTeacher) => teacher.is_active));
      return { subjects: subjectRows, sections: sectionAssignmentRows };
    } catch (err) {
      notify({ tone: "danger", title: "Subjects load failed", description: getErrorMessage(err, "Could not load subjects.") });
      return { subjects: [], sections: [] };
    } finally {
      setLoading(false);
    }
  }, [filters.college_id, filters.department_id, filters.major_id, notify, query]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setActive(null);
    setForm({ ...INITIAL_FORM, major_id: filters.major_id ?? (majorOptions[0]?.id ?? null) });
    setFormOpen(true);
  }

  function openEdit(row: AdminSubject) {
    setActive(row);
    setForm({
      name: row.name,
      code: row.code ?? "",
      description: row.description ?? "",
      major_id: row.major_id,
      cover_image_url: row.cover_image_url ?? "",
    });
    setFormOpen(true);
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.major_id) {
      notify({ tone: "warning", title: "Missing fields", description: "Name and major are required." });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        description: form.description.trim() || null,
        major_id: form.major_id,
        cover_image_url: form.cover_image_url.trim() || null,
      };
      if (active) {
        await updateSubject(active.id, payload);
        notify({ tone: "success", title: "Subject updated" });
      } else {
        await createSubject(payload);
        notify({ tone: "success", title: "Subject created" });
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      notify({ tone: "danger", title: "Save failed", description: getErrorMessage(err, "Unable to save subject.") });
    } finally {
      setSubmitting(false);
    }
  }

  async function onUploadCover(file: File) {
    setUploadingCover(true);
    try {
      const upload = await uploadAdminMedia(file, "subject");
      const url = upload.secure_url;
      setForm((prev) => ({ ...prev, cover_image_url: url }));

      if (active) {
        await updateSubject(active.id, { cover_image_url: url });
        notify({ tone: "success", title: "Cover uploaded and applied" });
        await load();
      } else {
        notify({ tone: "success", title: "Cover uploaded", description: "Click Save Subject to persist this image." });
      }
    } catch (err) {
      notify({ tone: "danger", title: "Cover upload failed", description: getErrorMessage(err, "Unable to upload image.") });
    } finally {
      setUploadingCover(false);
    }
  }

  async function onSaveAssignmentTeacher(sectionId: number) {
    if (!active) return;
    const subjectId = active.id;
    const value = draftTeacherBySection[sectionId] ?? "";
    const nextTeacherId = value ? Number(value) : null;
    const assignment = activeAssignments.find((row) => row.section_id === sectionId);
    if (nextTeacherId && assignment && assignment.department_id !== null) {
      const selectedTeacher = teachers.find((teacher) => teacher.id === nextTeacherId);
      if (!selectedTeacher || selectedTeacher.department_id !== assignment.department_id) {
        notify({ tone: "warning", title: "Invalid teacher", description: "Teacher must belong to this section's department." });
        return;
      }
    }
    const key = `${subjectId}-${sectionId}`;
    setAssignmentBusyKey(key);
    try {
      if (nextTeacherId) {
        await assignSectionTeacher(sectionId, nextTeacherId, subjectId);
      } else {
        await unassignSectionTeacher(sectionId, subjectId);
      }
      const { subjects, sections } = await load();
      const fresh = subjects.find((row) => row.id === subjectId);
      if (fresh) {
        setActive(fresh);
        const draft: Record<number, string> = {};
        for (const row of sections) {
          if (row.subject_id === subjectId) {
            draft[row.id] = row.teacher_id ? String(row.teacher_id) : "";
          }
        }
        setDraftTeacherBySection(draft);
      }
      notify({ tone: "success", title: "Assignment updated" });
    } catch (err) {
      notify({ tone: "danger", title: "Update failed", description: getErrorMessage(err, "Unable to update assignment.") });
    } finally {
      setAssignmentBusyKey(null);
    }
  }

  async function onAddSectionAssignment() {
    if (!active || !linkSectionId) return;
    const subjectId = active.id;
    const sectionId = Number(linkSectionId);
    if (active.major_id !== null) {
      const section = sectionCatalog.find((row) => row.id === sectionId);
      if (!section || section.major_id !== active.major_id) {
        notify({ tone: "warning", title: "Invalid section", description: "Section must belong to the subject's major." });
        return;
      }
    }
    if (linkTeacherId && selectedSectionForLink && selectedSectionForLink.department_id !== null) {
      const selectedTeacher = teachers.find((teacher) => teacher.id === Number(linkTeacherId));
      if (!selectedTeacher || selectedTeacher.department_id !== selectedSectionForLink.department_id) {
        notify({ tone: "warning", title: "Invalid teacher", description: "Teacher must belong to this section's department." });
        return;
      }
    }
    const key = `${subjectId}-new`;
    setAssignmentBusyKey(key);
    try {
      if (linkTeacherId) {
        await assignSectionTeacher(sectionId, Number(linkTeacherId), subjectId);
      } else {
        await updateSection(sectionId, { subject_id: subjectId, teacher_id: null });
      }
      setLinkSectionId("");
      setLinkTeacherId("");
      const { subjects, sections } = await load();
      const fresh = subjects.find((row) => row.id === subjectId);
      if (fresh) {
        setActive(fresh);
        const draft: Record<number, string> = {};
        for (const row of sections) {
          if (row.subject_id === subjectId) {
            draft[row.id] = row.teacher_id ? String(row.teacher_id) : "";
          }
        }
        setDraftTeacherBySection(draft);
      }
      notify({ tone: "success", title: "Section linked to subject" });
    } catch (err) {
      notify({ tone: "danger", title: "Add failed", description: getErrorMessage(err, "Unable to link section.") });
    } finally {
      setAssignmentBusyKey(null);
    }
  }

  async function onConfirmDelete(password: string) {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteSubject(deleteTarget.id, password);
      notify({ tone: "success", title: "Subject deleted" });
      setDeleteTarget(null);
      await load();
    } catch (err) {
      notify({ tone: "danger", title: "Delete failed", description: getErrorMessage(err, "Unable to delete subject.") });
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PageHeader title={<><BookOpen className="h-5 w-5" />Subjects</>} description="Create, edit, and organize subject records with hierarchy ownership." />
          <Button onClick={openCreate}><PlusCircle className="mr-2 h-4 w-4" />New Subject</Button>
        </div>

        <AcademicFilterBar
          filters={filters}
          colleges={colleges}
          departments={departments}
          majors={majors}
          onChange={setFilters}
          onClearFilter={clearFilter}
          onClearAll={clearAll}
        />

        <Card>
          <CardContent className="space-y-4 pt-4">
            <form onSubmit={(event) => { event.preventDefault(); void load(); }} className="flex gap-2">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subject name/code..." />
              <Button variant="outline" type="submit">Search</Button>
            </form>

            {loading ? (
              <div className="space-y-2">{[1, 2, 3, 4].map((index) => <Skeleton key={index} className="h-11 w-full" />)}</div>
            ) : items.length ? (
              <Table>
                <THead><TR><TH>ID</TH><TH>Subject</TH><TH>Section Roster</TH><TH>Actions</TH></TR></THead>
                <TBody>
                  {items.map((row) => (
                    <TR key={row.id} className="cursor-pointer" onClick={() => openDetails(row)}>
                      <TD>{row.id}</TD>
                      <TD>
                        <div>
                          <p className="font-semibold">{row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.code ?? "No code"}</p>
                        </div>
                      </TD>
                      <TD>
                        {(assignmentsBySubject.get(row.id) ?? []).length ? (
                          <div className="space-y-1">
                            {(assignmentsBySubject.get(row.id) ?? []).slice(0, 3).map((assignment) => (
                              <div key={`${row.id}-${assignment.section_id}`} className="rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-xs">
                                <span className="font-semibold">{assignment.section_name}</span>
                                <span className="text-muted-foreground"> • {assignment.teacher_name}</span>
                              </div>
                            ))}
                            {(assignmentsBySubject.get(row.id) ?? []).length > 3 ? (
                              <p className="text-xs text-muted-foreground">
                                +{(assignmentsBySubject.get(row.id) ?? []).length - 3} more
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No section assignments yet.</p>
                        )}
                      </TD>
                      <TD>
                        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                          <Button size="sm" variant="outline" onClick={() => openEdit(row)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => setDeleteTarget(row)}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No subjects found.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal open={formOpen} onClose={() => !submitting && setFormOpen(false)} title={active ? "Edit Subject" : "Create Subject"} description="Manage subject profile and hierarchy ownership." className="max-w-xl">
        <form className="space-y-3" onSubmit={onSave}>
          <label className="space-y-1 text-sm"><span>Name</span><Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required /></label>
          <label className="space-y-1 text-sm"><span>Code</span><Input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} /></label>
          <label className="space-y-1 text-sm"><span>Description</span><Input value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} /></label>
          <label className="space-y-1 text-sm">
            <span>Major</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.major_id ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, major_id: event.target.value ? Number(event.target.value) : null }))}
              required
            >
              <option value="">Select major</option>
              {majorOptions.map((major) => <option key={major.id} value={major.id}>{major.code} - {major.name}</option>)}
            </select>
          </label>

          <div className="space-y-2 rounded-lg border border-border/70 p-3">
            <label className="space-y-1 text-sm"><span>Cover image URL</span><Input value={form.cover_image_url} onChange={(event) => setForm((prev) => ({ ...prev, cover_image_url: event.target.value }))} placeholder="https://..." /></label>
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-accent">
                <ImagePlus className="mr-1 h-3.5 w-3.5" />Upload Cover
                <input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onUploadCover(file); }} />
              </label>
              {uploadingCover ? <span className="text-xs text-muted-foreground">Uploading...</span> : null}
            </div>
            {form.cover_image_url ? <img src={form.cover_image_url} alt="Subject cover" className="h-24 w-full rounded-md object-cover" /> : null}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Subject"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)} title={active?.name ?? "Subject details"} description={active?.code ?? ""} className="max-w-4xl">
        {active ? (
          <div className="space-y-4">
            {active.cover_image_url ? <img src={active.cover_image_url} alt={active.name} className="h-32 w-full rounded-md object-cover" /> : null}
            <div className="flex flex-wrap gap-1">
              <Badge tone="default">{active.college_name ?? "-"}</Badge>
              <Badge tone="default">{active.department_name ?? "-"}</Badge>
              <Badge tone="default">{active.major_name ?? "-"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{active.description || "No description."}</p>

            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><PlusCircle className="h-4 w-4" />Link Section to Subject</div>
              <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_auto]">
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={linkSectionId} onChange={(e) => setLinkSectionId(e.target.value)}>
                  <option value="">Select section</option>
                  {availableSectionsForActive.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
                </select>
                <label className="flex h-10 items-center gap-1 rounded-md border border-input bg-muted/30 px-2 text-xs">
                  <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    className="h-7 min-w-[120px] border-0 bg-transparent text-xs outline-none"
                    value={sectionMajorFilter}
                    onChange={(e) => setSectionMajorFilter(e.target.value)}
                  >
                    <option value="context">Subject major</option>
                    <option value="all">All majors</option>
                    {sectionMajorOptions.map((major) => <option key={major.id} value={major.id}>{major.code}</option>)}
                  </select>
                </label>
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={linkTeacherId} onChange={(e) => setLinkTeacherId(e.target.value)}>
                  <option value="">No teacher yet</option>
                  {teacherOptionsForLink.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullname?.trim() || teacher.username}</option>)}
                </select>
                <label className="flex h-10 items-center gap-1 rounded-md border border-input bg-muted/30 px-2 text-xs">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    className="h-7 min-w-[130px] border-0 bg-transparent text-xs outline-none"
                    value={teacherDepartmentFilter}
                    onChange={(e) => setTeacherDepartmentFilter(e.target.value)}
                  >
                    <option value="context">Section dept</option>
                    <option value="all">All depts</option>
                    {teacherDepartmentOptions.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                  </select>
                </label>
                <Button onClick={() => void onAddSectionAssignment()} disabled={!linkSectionId || assignmentBusyKey === `${active.id}-new`}>
                  {assignmentBusyKey === `${active.id}-new` ? "Adding..." : "Add"}
                </Button>
              </div>
              {availableSectionsForActive.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">No available sections for this major filter.</p>
              ) : null}
            </div>

            <div className="space-y-2">
              {activeAssignments.length ? activeAssignments.map((assignment) => {
                const key = `${active.id}-${assignment.section_id}`;
                return (
                  <div key={key} className="rounded-xl border border-border/70 bg-background/70 p-3">
                    <div className="mb-2 grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-center">
                      <p className="flex items-center gap-2 rounded-md border border-sky-300/40 bg-sky-100/30 px-2 py-1 text-sm font-semibold">{assignment.section_name}</p>
                      <p className="text-sm text-muted-foreground">{assignment.teacher_name}</p>
                      <Badge tone={assignment.teacher_id ? "success" : "default"}>{assignment.teacher_id ? "Assigned" : "Unassigned"}</Badge>
                    </div>
                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      {(() => {
                        let departmentId: number | null = null;
                        if (teacherDepartmentFilter === "context") {
                          departmentId = assignment.department_id;
                        } else if (teacherDepartmentFilter !== "all") {
                          const parsed = Number(teacherDepartmentFilter);
                          departmentId = Number.isFinite(parsed) ? parsed : null;
                        }
                        const scoped = departmentId !== null
                          ? teachers.filter((teacher) => teacher.department_id === departmentId)
                          : teachers;
                        const options = [...scoped];
                        if (assignment.teacher_id && !options.some((teacher) => teacher.id === assignment.teacher_id)) {
                          const selected = teachers.find((teacher) => teacher.id === assignment.teacher_id);
                          if (selected) options.unshift(selected);
                        }
                        return (
                          <select
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            value={draftTeacherBySection[assignment.section_id] ?? ""}
                            onChange={(e) => setDraftTeacherBySection((prev) => ({ ...prev, [assignment.section_id]: e.target.value }))}
                          >
                            <option value="">No teacher</option>
                            {options.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullname?.trim() || teacher.username}</option>)}
                          </select>
                        );
                      })()}
                      <Button variant="outline" onClick={() => void onSaveAssignmentTeacher(assignment.section_id)} disabled={assignmentBusyKey === key}>
                        {assignmentBusyKey === key ? "Saving..." : "Save Teacher"}
                      </Button>
                    </div>
                  </div>
                );
              }) : (
                <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  No section assignments yet.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <CriticalActionModal
        open={Boolean(deleteTarget)}
        onClose={() => !deleteLoading && setDeleteTarget(null)}
        onConfirm={onConfirmDelete}
        loading={deleteLoading}
        title="Delete subject"
        description={`Delete \"${deleteTarget?.name ?? ""}\"? This cannot be undone.`}
        confirmText="Delete Subject"
      />
    </>
  );
}
