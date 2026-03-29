"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BookOpen, Building2, GraduationCap, Layers3, PlusCircle, UserSquare2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import {
  assignSectionTeacher,
  getSections,
  getSubjects,
  getTeachers,
  unassignSectionTeacher,
  updateSection,
} from "@/features/admin/api";
import type { AdminSection, AdminSubject, AdminTeacher } from "@/features/admin/types";
import { getErrorMessage } from "@/lib/errors";

type SectionAssignment = {
  subject_id: number;
  subject_name: string;
  teacher_id: number | null;
  teacher_name: string;
};

type SectionGroup = {
  id: number;
  name: string;
  major_id: number | null;
  major_name: string | null;
  department_id: number | null;
  year_level: number | null;
  section_code: string | null;
  assignments: SectionAssignment[];
};

function buildSectionGroups(rows: AdminSection[]): SectionGroup[] {
  const map = new Map<number, SectionGroup>();

  for (const row of rows) {
    const existing = map.get(row.id);
    if (!existing) {
      map.set(row.id, {
        id: row.id,
        name: row.name,
        major_id: row.major_id ?? null,
        major_name: row.major_name ?? null,
        department_id: row.department_id ?? null,
        year_level: row.year_level ?? null,
        section_code: row.section_code ?? row.section_letter ?? null,
        assignments: [],
      });
    }

    if (row.subject_id !== null) {
      const group = map.get(row.id)!;
      const alreadyExists = group.assignments.some((assignment) => assignment.subject_id === row.subject_id);
      if (!alreadyExists) {
        group.assignments.push({
          subject_id: row.subject_id,
          subject_name: row.subject_name,
          teacher_id: row.teacher_id ?? null,
          teacher_name: row.teacher_fullname?.trim() || row.teacher_username,
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export default function SectionsPage() {
  const { notify } = useToast();
  const [sectionRows, setSectionRows] = useState<AdminSection[]>([]);
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionGroup | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [draftTeacherBySubject, setDraftTeacherBySubject] = useState<Record<number, string>>({});
  const [newSubjectId, setNewSubjectId] = useState<string>("");
  const [newTeacherId, setNewTeacherId] = useState<string>("");
  const [subjectMajorFilter, setSubjectMajorFilter] = useState<string>("context");
  const [teacherDepartmentFilter, setTeacherDepartmentFilter] = useState<string>("context");

  async function load(): Promise<AdminSection[]> {
    setLoading(true);
    try {
      const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}&limit=1200` : "?limit=1200";
      const [sectionsRes, teachersRes, subjectsRes] = await Promise.all([
        getSections(params),
        getTeachers("?limit=400"),
        getSubjects("?limit=1200"),
      ]);
      const rows = sectionsRes.items ?? [];
      setSectionRows(rows);
      setTeachers((teachersRes.items ?? []).filter((teacher: AdminTeacher) => teacher.is_active));
      setSubjects(subjectsRes.items ?? []);
      return rows;
    } catch (err) {
      notify({
        tone: "danger",
        title: "Sections load failed",
        description: getErrorMessage(err, "Could not load sections."),
      });
      return [];
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const sectionGroups = useMemo(() => buildSectionGroups(sectionRows), [sectionRows]);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sectionGroups;
    return sectionGroups.filter((section) => {
      const rosterText = section.assignments.map((row) => `${row.subject_name} ${row.teacher_name}`).join(" ").toLowerCase();
      return (
        section.name.toLowerCase().includes(q) ||
        (section.major_name ?? "").toLowerCase().includes(q) ||
        rosterText.includes(q)
      );
    });
  }, [query, sectionGroups]);

  const availableSubjects = useMemo(() => {
    if (!activeSection) return [];
    const linkedIds = new Set(activeSection.assignments.map((row) => row.subject_id));
    const unlinked = subjects.filter((subject) => !linkedIds.has(subject.id));
    let majorId: number | null = null;
    if (subjectMajorFilter === "context") {
      majorId = activeSection.major_id ?? null;
    } else if (subjectMajorFilter !== "all") {
      const parsed = Number(subjectMajorFilter);
      majorId = Number.isFinite(parsed) ? parsed : null;
    }
    const scoped = majorId !== null ? unlinked.filter((subject) => subject.major_id === majorId) : unlinked;
    if (scoped.length === 0 && subjectMajorFilter === "context") {
      return unlinked;
    }
    return scoped;
  }, [activeSection, subjectMajorFilter, subjects]);

  const subjectMajorOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const subject of subjects) {
      if (subject.major_id === null) continue;
      if (!map.has(subject.major_id)) {
        map.set(subject.major_id, subject.major_name ?? `Major ${subject.major_id}`);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects]);

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

  const departmentTeachers = useMemo(() => {
    if (!activeSection) return [];
    let departmentId: number | null = null;
    if (teacherDepartmentFilter === "context") {
      departmentId = activeSection.department_id ?? null;
    } else if (teacherDepartmentFilter !== "all") {
      const parsed = Number(teacherDepartmentFilter);
      departmentId = Number.isFinite(parsed) ? parsed : null;
    }
    return departmentId !== null
      ? teachers.filter((teacher) => teacher.department_id === departmentId)
      : teachers;
  }, [activeSection, teacherDepartmentFilter, teachers]);

  function openDetails(section: SectionGroup) {
    setActiveSection(section);
    setDetailsOpen(true);
    setNewSubjectId("");
    setNewTeacherId("");
    setSubjectMajorFilter("context");
    setTeacherDepartmentFilter("context");
    const nextDraft: Record<number, string> = {};
    for (const row of section.assignments) {
      nextDraft[row.subject_id] = row.teacher_id ? String(row.teacher_id) : "";
    }
    setDraftTeacherBySubject(nextDraft);
  }

  async function saveTeacher(sectionId: number, subjectId: number) {
    const key = `${sectionId}-${subjectId}`;
    const nextTeacher = draftTeacherBySubject[subjectId] ? Number(draftTeacherBySubject[subjectId]) : null;
    if (nextTeacher && activeSection && activeSection.department_id !== null) {
      const selectedTeacher = teachers.find((teacher) => teacher.id === nextTeacher);
      if (!selectedTeacher || selectedTeacher.department_id !== activeSection.department_id) {
        notify({ tone: "warning", title: "Invalid teacher", description: "Teacher must belong to this section's department." });
        return;
      }
    }
    setBusyKey(key);
    try {
      if (nextTeacher) {
        await assignSectionTeacher(sectionId, nextTeacher, subjectId);
      } else {
        await unassignSectionTeacher(sectionId, subjectId);
      }
      const rows = await load();
      const fresh = buildSectionGroups(rows).find((row) => row.id === sectionId);
      if (fresh) openDetails(fresh);
      notify({ tone: "success", title: "Assignment updated" });
    } catch (err) {
      notify({ tone: "danger", title: "Save failed", description: getErrorMessage(err, "Unable to update teacher assignment.") });
    } finally {
      setBusyKey(null);
    }
  }

  async function addSubjectAssignment() {
    if (!activeSection || !newSubjectId) return;
    const sectionId = activeSection.id;
    const subjectId = Number(newSubjectId);
    const subject = subjects.find((item) => item.id === subjectId) ?? null;
    if (activeSection.major_id !== null && (!subject || subject.major_id !== activeSection.major_id)) {
      notify({ tone: "warning", title: "Invalid subject", description: "Subject must belong to this section's major." });
      return;
    }
    if (newTeacherId && activeSection.department_id !== null) {
      const selectedTeacher = teachers.find((teacher) => teacher.id === Number(newTeacherId));
      if (!selectedTeacher || selectedTeacher.department_id !== activeSection.department_id) {
        notify({ tone: "warning", title: "Invalid teacher", description: "Teacher must belong to this section's department." });
        return;
      }
    }
    setBusyKey(`${sectionId}-new`);
    try {
      if (newTeacherId) {
        await assignSectionTeacher(sectionId, Number(newTeacherId), subjectId);
      } else {
        await updateSection(sectionId, { subject_id: subjectId, teacher_id: null });
      }
      const rows = await load();
      const fresh = buildSectionGroups(rows).find((row) => row.id === sectionId);
      if (fresh) openDetails(fresh);
      notify({ tone: "success", title: "Subject added to section" });
    } catch (err) {
      notify({ tone: "danger", title: "Add failed", description: getErrorMessage(err, "Unable to add subject assignment.") });
    } finally {
      setBusyKey(null);
    }
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  return (
    <div className="space-y-4">
      <PageHeader title={<><Layers3 className="h-5 w-5" />Sections</>} description="Each section now shows a full subject-teacher roster." />
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={onSearch} className="mb-4 flex gap-2">
            <Input placeholder="Search section, subject, teacher..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <Button variant="outline" type="submit">Search</Button>
          </form>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
          ) : filteredSections.length ? (
            <Table>
              <THead><TR><TH>Section</TH><TH>Subject Roster</TH><TH>Count</TH></TR></THead>
              <TBody>
                {filteredSections.map((section) => (
                  <TR key={section.id} className="cursor-pointer" onClick={() => openDetails(section)}>
                    <TD>
                      <p className="font-semibold">{section.name}</p>
                      <p className="text-xs text-muted-foreground">Y{section.year_level ?? "-"} / {section.section_code ?? "-"} - {section.major_name ?? "-"}</p>
                    </TD>
                    <TD>
                      {section.assignments.length ? (
                        <div className="space-y-1">
                          {section.assignments.slice(0, 3).map((row) => (
                            <div key={`${section.id}-${row.subject_id}`} className="rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-xs">
                              <span className="font-semibold">{row.subject_name}</span>
                              <span className="text-muted-foreground"> - {row.teacher_name}</span>
                            </div>
                          ))}
                          {section.assignments.length > 3 ? <p className="text-xs text-muted-foreground">+{section.assignments.length - 3} more</p> : null}
                        </div>
                      ) : <p className="text-xs text-muted-foreground">No linked subjects.</p>}
                    </TD>
                    <TD><Badge tone={section.assignments.length ? "success" : "default"}>{section.assignments.length}</Badge></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No sections found.</p>
          )}
        </CardContent>
      </Card>

      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)} title={activeSection?.name ?? "Section"} description="Manage all subject-teacher pairs for this section." className="max-w-4xl">
        {activeSection ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><PlusCircle className="h-4 w-4" />Add Subject Assignment</div>
              <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_auto]">
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={newSubjectId} onChange={(e) => setNewSubjectId(e.target.value)}>
                  <option value="">Select subject</option>
                  {availableSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code ?? subject.name}</option>)}
                </select>
                <label className="flex h-10 items-center gap-1 rounded-md border border-input bg-muted/30 px-2 text-xs">
                  <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    className="h-7 min-w-[120px] border-0 bg-transparent text-xs outline-none"
                    value={subjectMajorFilter}
                    onChange={(e) => setSubjectMajorFilter(e.target.value)}
                  >
                    <option value="context">Section major</option>
                    <option value="all">All majors</option>
                    {subjectMajorOptions.map((major) => <option key={major.id} value={major.id}>{major.name}</option>)}
                  </select>
                </label>
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={newTeacherId} onChange={(e) => setNewTeacherId(e.target.value)}>
                  <option value="">No teacher yet</option>
                  {departmentTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullname?.trim() || teacher.username}</option>)}
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
                <Button onClick={() => void addSubjectAssignment()} disabled={!newSubjectId || busyKey === `${activeSection.id}-new`}>{busyKey === `${activeSection.id}-new` ? "Adding..." : "Add"}</Button>
              </div>
              {availableSubjects.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">No available subjects for this major filter.</p>
              ) : null}
            </div>

            <div className="space-y-2">
              {activeSection.assignments.length ? activeSection.assignments.map((assignment) => {
                const key = `${activeSection.id}-${assignment.subject_id}`;
                return (
                  <div key={key} className="rounded-xl border border-border/70 bg-background/70 p-3">
                    <div className="mb-2 grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-center">
                      <p className="flex items-center gap-2 rounded-md border border-emerald-300/40 bg-emerald-100/30 px-2 py-1 text-sm font-semibold"><BookOpen className="h-3.5 w-3.5 text-emerald-700" />{assignment.subject_name}</p>
                      <p className="flex items-center gap-2 rounded-md border border-amber-300/40 bg-amber-100/30 px-2 py-1 text-sm font-semibold"><UserSquare2 className="h-3.5 w-3.5 text-amber-700" />{assignment.teacher_name}</p>
                      <Badge tone={assignment.teacher_id ? "success" : "default"}>{assignment.teacher_id ? "Assigned" : "Unassigned"}</Badge>
                    </div>
                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      {(() => {
                        const options = [...departmentTeachers];
                        if (assignment.teacher_id && !options.some((teacher) => teacher.id === assignment.teacher_id)) {
                          const assigned = teachers.find((teacher) => teacher.id === assignment.teacher_id);
                          if (assigned) options.unshift(assigned);
                        }
                        return (
                          <select
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            value={draftTeacherBySubject[assignment.subject_id] ?? ""}
                            onChange={(e) => setDraftTeacherBySubject((prev) => ({ ...prev, [assignment.subject_id]: e.target.value }))}
                          >
                            <option value="">No teacher</option>
                            {options.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullname?.trim() || teacher.username}</option>)}
                          </select>
                        );
                      })()}
                      <Button variant="outline" onClick={() => void saveTeacher(activeSection.id, assignment.subject_id)} disabled={busyKey === key}>{busyKey === key ? "Saving..." : "Save Teacher"}</Button>
                    </div>
                  </div>
                );
              }) : <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No assignments yet. Add one above.</p>}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

