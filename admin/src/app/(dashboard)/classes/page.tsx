"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  MoreVertical,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
  UserPlus,
  Users,
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
  getSections,
  getSubjects,
  getTeachers,
  uploadSubjectCoverImage,
  updateSection,
  updateSubject,
} from "@/features/admin/api";
import type { AdminSection, AdminSubject, AdminTeacher } from "@/features/admin/types";
import { TeacherSelect } from "@/features/admin/components/teacher-select";
import { SearchBar } from "@/components/ui/search-bar";

type ModalMode = "create" | "edit";

export default function ClassesPage() {
  const { notify } = useToast();
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

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

  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [sectionModalMode, setSectionModalMode] = useState<ModalMode>("create");
  const [editingSection, setEditingSection] = useState<AdminSection | null>(null);
  const [sectionName, setSectionName] = useState("");
  const [sectionSubjectId, setSectionSubjectId] = useState<number | null>(null);

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

  const filteredSubjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((item) => {
      const subjectMatch = item.name.toLowerCase().includes(q) || (item.code ?? "").toLowerCase().includes(q);
      if (subjectMatch) return true;
      const relatedSections = sectionsBySubject.get(item.id) ?? [];
      return relatedSections.some(
        (section) =>
          section.name.toLowerCase().includes(q) ||
          section.subject_name.toLowerCase().includes(q) ||
          section.teacher_username.toLowerCase().includes(q)
      );
    });
  }, [query, sectionsBySubject, subjects]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subjectsRes, sectionsRes, teachersRes] = await Promise.all([
        getSubjects("?limit=200"),
        getSections("?limit=200"),
        getTeachers("?limit=200"),
      ]);
      setSubjects(subjectsRes.items);
      setSections(sectionsRes.items);
      setTeachers(teachersRes.items.filter((item) => item.is_active));
    } catch (err) {
      notify({
        tone: "danger",
        title: "Load failed",
        description: err instanceof Error ? err.message : "Could not load classes data.",
      });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-actions-menu]")) return;
      setOpenSubjectMenuId(null);
      setOpenSectionMenuId(null);
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenSubjectMenuId(null);
      setOpenSectionMenuId(null);
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
  }

  function resetSectionForm() {
    setSectionName("");
    setSectionSubjectId(subjects[0]?.id ?? null);
  }

  function openSubjectCreate() {
    setSubjectModalMode("create");
    setEditingSubject(null);
    resetSubjectForm();
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
    setSectionSubjectId(subjects[0]?.id ?? null);
    setSectionModalOpen(true);
  }

  function openSectionEdit(item: AdminSection) {
    setSectionModalMode("edit");
    setEditingSection(item);
    setSectionName(item.name);
    setSectionSubjectId(item.subject_id);
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
        });
        notify({ tone: "success", title: "Subject created" });
      } else if (editingSubject) {
        await updateSubject(editingSubject.id, {
          name: subjectName.trim(),
          code: subjectCode.trim() || "",
          description: subjectDescription.trim() || "",
          cover_image_url: resolvedCoverImageUrl || "",
        });
        notify({ tone: "success", title: "Subject updated" });
      }
      setSubjectModalOpen(false);
      setUploadingSubjectCover(false);
      await load();
    } catch (err) {
      setUploadingSubjectCover(false);
      notify({
        tone: "danger",
        title: "Subject save failed",
        description: err instanceof Error ? err.message : "Could not save subject.",
      });
    }
  }

  async function onSectionSubmit(e: FormEvent) {
    e.preventDefault();
    if (!sectionSubjectId) return;
    try {
      if (sectionModalMode === "create") {
        await createSection({
          name: sectionName.trim(),
          subject_id: sectionSubjectId,
        });
        notify({ tone: "success", title: "Section created" });
      } else if (editingSection) {
        await updateSection(editingSection.id, {
          name: sectionName.trim(),
          subject_id: sectionSubjectId,
        });
        notify({ tone: "success", title: "Section updated" });
      }
      setSectionModalOpen(false);
      await load();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Section save failed",
        description: err instanceof Error ? err.message : "Could not save section.",
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
        section_name: newClassSectionName.trim(),
      });
      notify({ tone: "success", title: "Class created", description: "Assign a teacher next." });
      setClassModalOpen(false);
      setNewClassSubjectId(null);
      setNewClassSubjectName("");
      setNewClassSubjectCode("");
      setNewClassSectionName("");
      await load();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Class creation failed",
        description: err instanceof Error ? err.message : "Could not create class.",
      });
    }
  }

  async function onAssignConfirm() {
    if (!assigningSection || !selectedTeacherId) return;
    try {
      await assignSectionTeacher(assigningSection.id, selectedTeacherId);
      notify({ tone: "success", title: "Class assigned to teacher" });
      setAssignModalOpen(false);
      setAssigningSection(null);
      await load();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Assignment failed",
        description: err instanceof Error ? err.message : "Could not assign teacher.",
      });
    }
  }

  async function onDeleteSubject(item: AdminSubject) {
    try {
      await deleteSubject(item.id);
      notify({ tone: "success", title: "Subject deleted" });
      setSubjectDeleteModalOpen(false);
      setActiveSubject(null);
      await load();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Could not delete subject.",
      });
    }
  }

  async function onDeleteSection(item: AdminSection) {
    try {
      await deleteSection(item.id);
      notify({ tone: "success", title: "Section deleted" });
      setSectionDeleteModalOpen(false);
      setActiveSection(null);
      await load();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Could not delete section.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={<><BookOpen className="h-5 w-5" />Classes</>} description="Manage subjects, sections, and teacher assignment in one workspace." />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <SearchBar
          placeholder="Search subject or section..."
          value={query}
          onChange={setQuery}
          className="max-w-md"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={openSubjectCreate} className="h-11 rounded-xl font-bold shadow-sm">
            <BookOpen className="mr-2 h-4 w-4" />
            New Subject
          </Button>
          <Button variant="outline" onClick={openSectionCreate} className="h-11 rounded-xl font-bold shadow-sm">
            <Users className="mr-2 h-4 w-4" />
            New Section
          </Button>
          <Button onClick={() => setClassModalOpen(true)} className="h-11 rounded-xl font-bold shadow-sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Class
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-80 w-full rounded-2xl" />)}
          </div>
        ) : filteredSubjects.length ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {filteredSubjects.map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col min-h-[22rem] overflow-visible rounded-2xl border border-border/50 bg-card shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
              >
                {/* Image Section */}
                <div
                  className="relative h-48 overflow-hidden rounded-t-2xl bg-cover bg-center"
                  style={{ backgroundImage: `url('${item.cover_image_url || "/background.png"}')` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent" />

                  {/* Subject Info Overlap */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <Badge tone="default" className="w-fit mb-2 bg-background/80 backdrop-blur-sm border-white/20 text-[10px] font-black uppercase tracking-widest text-primary">
                      {item.code ?? "CORE"}
                    </Badge>
                    <h3 className="text-xl font-black text-foreground tracking-tight leading-tight">
                      {item.name}
                    </h3>
                  </div>

                  {/* Top Actions */}
                  <div className="absolute right-4 top-4 z-30" data-actions-menu>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 rounded-xl border-white/20 bg-background/40 text-foreground backdrop-blur-md hover:bg-background/80 transition-all"
                      onClick={() => {
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

                <div className="flex-1 p-6 flex flex-col gap-5">
                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-muted/30 border border-border/50">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-background">
                        {item.teacher_profile_picture_url ? (
                          <img
                            src={item.teacher_profile_picture_url}
                            alt={item.teacher_username}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-black uppercase text-primary">
                            {item.teacher_username ? item.teacher_username.charAt(0) : "U"}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                        {item.teacher_username || "No Lead Teacher"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/5 border border-indigo-500/10 text-indigo-600">
                      <Users className="h-3.5 w-3.5" />
                      <span className="text-xs font-black uppercase tracking-tighter">
                        {item.sections_count} Section{item.sections_count === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  {/* Subject Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.5rem]">
                    {item.description || "No description provided for this subject."}
                  </p>

                  {/* Sections Expander */}
                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300",
                        expandedSubjectIds.includes(item.id)
                          ? "bg-primary/[0.03] border-primary/20 shadow-inner"
                          : "bg-background border-border hover:border-primary/30 hover:bg-muted/30"
                      )}
                      onClick={() => toggleSubjectExpanded(item.id)}
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                          expandedSubjectIds.includes(item.id) ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-foreground leading-none mb-0.5">Sections & Assignment</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Manage classroom distribution</p>
                        </div>
                      </div>
                      <div className={cn(
                        "h-6 w-6 rounded-full bg-background border flex items-center justify-center transition-transform duration-300",
                        expandedSubjectIds.includes(item.id) ? "rotate-180 border-primary/30 text-primary" : "border-border text-muted-foreground"
                      )}>
                        <ChevronDown className="h-3 w-3" />
                      </div>
                    </button>

                    {expandedSubjectIds.includes(item.id) && (
                      <div className="grid gap-3 animate-in slide-in-from-top-2 duration-300">
                        {(sectionsBySubject.get(item.id) ?? []).length ? (
                          (sectionsBySubject.get(item.id) ?? []).map((section) => (
                            <div
                              key={section.id}
                              className="group/section flex items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-muted/20 hover:bg-background hover:border-primary/20 transition-all shadow-sm"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-black text-foreground mb-1.5">{section.name}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black text-muted-foreground uppercase">Assignee:</span>
                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border/40 bg-background/50">
                                    <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center">
                                      <span className="text-[8px] font-bold text-primary">
                                        {section.teacher_username ? section.teacher_username.charAt(0) : "?"}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-foreground">
                                      {section.teacher_username || "Available"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="relative" data-actions-menu>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-lg hover:bg-primary/5 hover:text-primary transition-all"
                                  onClick={() => {
                                    setOpenSectionMenuId((prev) => (prev === section.id ? null : section.id));
                                    setOpenSubjectMenuId(null);
                                  }}
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                                {openSectionMenuId === section.id && (
                                  <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-border bg-card p-1.5 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-1">
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
                                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-bold hover:bg-accent transition-colors text-primary"
                                      onClick={() => {
                                        setOpenSectionMenuId(null);
                                        setAssigningSection(section);
                                        setSelectedTeacherId(section.teacher_id);
                                        setAssignModalOpen(true);
                                      }}
                                    >
                                      <UserPlus className="h-3 w-3" />
                                      Assign Teacher
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
                          ))
                        ) : (
                          <div className="p-8 text-center rounded-xl border border-dashed border-border/80 bg-muted/10">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No Sections Assigned</p>
                          </div>
                        )}
                      </div>
                    )}
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

      <Modal
        open={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        title={subjectModalMode === "create" ? "Create Subject" : "Edit Subject"}
        description="Keep subject definitions clear and reusable."
      >
        <form className="space-y-3" onSubmit={onSubjectSubmit}>
          <Input placeholder="Subject name" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} required />
          <Input placeholder="Code (optional)" value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} />
          <Input placeholder="Description (optional)" value={subjectDescription} onChange={(e) => setSubjectDescription(e.target.value)} />
          <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-3">
            <p className="text-sm font-medium">Subject Cover Image</p>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => onSubjectCoverChange(e.target.files?.[0] ?? null)}
            />
            {subjectCoverPreview ? (
              <div className="overflow-hidden rounded-lg border border-border/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={subjectCoverPreview} alt="Subject cover preview" className="h-36 w-full object-cover" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No image selected.</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setSubjectModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={uploadingSubjectCover}>
              {uploadingSubjectCover ? "Uploading image..." : "Save Subject"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={sectionModalOpen}
        onClose={() => setSectionModalOpen(false)}
        title={sectionModalMode === "create" ? "Create Section" : "Edit Section"}
        description="Sections are the class groups assigned to teachers."
      >
        <form className="space-y-3" onSubmit={onSectionSubmit}>
          <Input placeholder="Section name" value={sectionName} onChange={(e) => setSectionName(e.target.value)} required />
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={sectionSubjectId ?? ""}
            onChange={(e) => setSectionSubjectId(Number(e.target.value))}
            required
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setSectionModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Section</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        title="Create Class"
        description="Create a subject-section class in one flow."
      >
        <form className="space-y-3" onSubmit={onClassCreateSubmit}>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={newClassSubjectId ?? ""}
            onChange={(e) => setNewClassSubjectId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Create with new subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          {!newClassSubjectId ? (
            <>
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
            </>
          ) : null}
          <Input
            placeholder="Section name"
            value={newClassSectionName}
            onChange={(e) => setNewClassSectionName(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setClassModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Class</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Class To Teacher"
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
          <Button
            variant="outline"
            onClick={() => setSubjectDeleteModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (!activeSubject) return;
              onDeleteSubject(activeSubject);
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>

      <Modal
        open={sectionDeleteModalOpen}
        onClose={() => setSectionDeleteModalOpen(false)}
        title="Delete Section"
        description={activeSection ? `Delete ${activeSection.subject_name} - ${activeSection.name}? This cannot be undone.` : ""}
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setSectionDeleteModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (!activeSection) return;
              onDeleteSection(activeSection);
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
