"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Building2, Edit2, GraduationCap, Layers3, PlusCircle, Search, Trash2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { AcademicFilterBar } from "@/features/admin/components/academic-filter-bar";
import { 
  createSection, 
  createSubject, 
  deleteSection, 
  deleteSubject, 
  getSections, 
  getSubjects, 
  updateSection, 
  updateSubject,
  uploadSubjectCoverImage 
} from "@/features/admin/api";
import { useAcademicFilters } from "@/features/admin/hooks/use-academic-filters";
import { useAcademicHierarchyOptions } from "@/features/admin/hooks/use-academic-hierarchy-options";
import type { AdminSection, AdminSubject } from "@/features/admin/types";
import { getErrorMessage } from "@/lib/errors";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function SubjectsAndSectionsPage() {
  const { notify } = useToast();
  const searchParams = useSearchParams();
  const { filters, setFilters, clearFilter, clearAll } = useAcademicFilters();
  const { colleges, departments, majors } = useAcademicHierarchyOptions(filters);

  // Data State
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingSections, setLoadingSections] = useState(true);

  // Search State
  const [subjectQuery, setSubjectQuery] = useState("");
  const [sectionQuery, setSectionQuery] = useState("");

  // Modal State - Subjects
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<AdminSubject | null>(null);
  const [subjectSaving, setSubjectSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [subjectCoverFile, setSubjectCoverFile] = useState<File | null>(null);
  const [subjectCoverPreviewUrl, setSubjectCoverPreviewUrl] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState({
    name: "",
    code: "",
    major_id: "" as string | number,
    description: "",
    cover_image_url: "",
  });

  // Modal State - Sections
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<AdminSection | null>(null);
  const [sectionSaving, setSectionSaving] = useState(false);
  const [sectionForm, setSectionForm] = useState({
    major_id: "" as string | number,
    year_level: "" as string | number,
    section_code: "",
  });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'subject' | 'section', id: number, name: string } | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetching
  const loadSubjects = useCallback(async () => {
    setLoadingSubjects(true);
    try {
      const params: string[] = ["limit=1000"];
      if (filters.college_id) params.push(`college_id=${filters.college_id}`);
      if (filters.department_id) params.push(`department_id=${filters.department_id}`);
      if (filters.major_id) params.push(`major_id=${filters.major_id}`);
      
      const res = await getSubjects(`?${params.join("&")}`);
      setSubjects(res.items ?? []);
    } catch (err) {
      notify({ tone: "danger", title: "Load subjects failed", description: getErrorMessage(err, "Unable to load subjects.") });
    } finally {
      setLoadingSubjects(false);
    }
  }, [filters, notify]);

  const loadSections = useCallback(async () => {
    setLoadingSections(true);
    try {
      const params: string[] = ["limit=1000"];
      if (filters.college_id) params.push(`college_id=${filters.college_id}`);
      if (filters.department_id) params.push(`department_id=${filters.department_id}`);
      if (filters.major_id) params.push(`major_id=${filters.major_id}`);
      
      const res = await getSections(`?${params.join("&")}`);
      // Backend may expand a section into multiple rows (e.g., per subject assignment),
      // which can create duplicate `id`s. This page expects a unique list of sections.
      const items = res.items ?? [];
      const uniqueById = new Map<number, AdminSection>();
      for (const row of items) {
        if (!uniqueById.has(row.id)) uniqueById.set(row.id, row);
      }
      setSections(Array.from(uniqueById.values()));
    } catch (err) {
      notify({ tone: "danger", title: "Load sections failed", description: getErrorMessage(err, "Unable to load sections.") });
    } finally {
      setLoadingSections(false);
    }
  }, [filters, notify]);

  useEffect(() => {
    loadSubjects();
    loadSections();
  }, [loadSubjects, loadSections]);

  useEffect(() => {
    return () => {
      if (subjectCoverPreviewUrl) {
        try {
          URL.revokeObjectURL(subjectCoverPreviewUrl);
        } catch {
          // ignore
        }
      }
    };
  }, [subjectCoverPreviewUrl]);

  // Filtering Logic
  const filteredSubjects = useMemo(() => {
    const q = subjectQuery.toLowerCase().trim();
    if (!q) return subjects;
    return subjects.filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.code?.toLowerCase().includes(q)) ||
      (s.major_name?.toLowerCase().includes(q))
    );
  }, [subjects, subjectQuery]);

  const filteredSections = useMemo(() => {
    const q = sectionQuery.toLowerCase().trim();
    if (!q) return sections;
    return sections.filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.major_name?.toLowerCase().includes(q)) ||
      (s.section_code?.toLowerCase().includes(q))
    );
  }, [sections, sectionQuery]);

  // Subject CRUD Actions
  const openSubjectModal = (subject: AdminSubject | null = null) => {
    setSubjectCoverFile(null);
    setSubjectCoverPreviewUrl(null);
    if (subject) {
      setEditingSubject(subject);
      setSubjectForm({
        name: subject.name,
        code: subject.code ?? "",
        major_id: subject.major_id ?? "",
        description: subject.description ?? "",
        cover_image_url: subject.cover_image_url ?? "",
      });
    } else {
      setEditingSubject(null);
      setSubjectForm({
        name: "",
        code: "",
        major_id: filters.major_id ?? "",
        description: "",
        cover_image_url: "",
      });
    }
    setSubjectModalOpen(true);
  };

  const onSaveSubject = async (e: FormEvent) => {
    e.preventDefault();
    if (!subjectForm.name || !subjectForm.major_id) {
      notify({ tone: "warning", title: "Missing fields", description: "Name and Major are required." });
      return;
    }
    setSubjectSaving(true);
    try {
      let coverImageUrl: string | null = subjectForm.cover_image_url || null;
      if (subjectCoverFile) {
        setImageUploading(true);
        try {
          const res = await uploadSubjectCoverImage(subjectCoverFile);
          coverImageUrl = res.secure_url;
          setSubjectForm((f) => ({ ...f, cover_image_url: res.secure_url }));
          setSubjectCoverFile(null);
          setSubjectCoverPreviewUrl(null);
        } catch (err) {
          notify({ tone: "danger", title: "Upload failed", description: getErrorMessage(err, "Unable to upload image.") });
          return;
        } finally {
          setImageUploading(false);
        }
      }

      const payload = {
        name: subjectForm.name,
        code: subjectForm.code || null,
        major_id: Number(subjectForm.major_id),
        description: subjectForm.description || null,
        cover_image_url: coverImageUrl,
      };

      if (editingSubject) {
        await updateSubject(editingSubject.id, payload);
        notify({ tone: "success", title: "Subject updated" });
      } else {
        await createSubject(payload);
        notify({ tone: "success", title: "Subject created" });
      }
      setSubjectModalOpen(false);
      loadSubjects();
    } catch (err) {
      notify({ tone: "danger", title: "Save failed", description: getErrorMessage(err, "Unable to save subject.") });
    } finally {
      setSubjectSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubjectCoverFile(file);
    setSubjectCoverPreviewUrl(URL.createObjectURL(file));
    // Allow selecting the same file again to re-trigger onChange.
    e.target.value = "";
    notify({ tone: "success", title: "Image selected", description: "Click Save Subject to upload and save it." });
  };

  // Section CRUD Actions
  const openSectionModal = (section: AdminSection | null = null) => {
    if (section) {
      setEditingSection(section);
      setSectionForm({
        major_id: section.major_id ?? "",
        year_level: section.year_level ?? "",
        section_code: section.section_code ?? "",
      });
    } else {
      setEditingSection(null);
      setSectionForm({
        major_id: filters.major_id ?? "",
        year_level: "",
        section_code: "",
      });
    }
    setSectionModalOpen(true);
  };

  const onSaveSection = async (e: FormEvent) => {
    e.preventDefault();
    if (!sectionForm.major_id) {
      notify({ tone: "warning", title: "Missing fields", description: "Major selection is required." });
      return;
    }
    setSectionSaving(true);
    try {
      const payload = {
        major_id: Number(sectionForm.major_id),
        year_level: sectionForm.year_level ? Number(sectionForm.year_level) : null,
        section_code: sectionForm.section_code || null,
      };
      // Note: If major, year, and code are provided, name is often auto-generated on backend
      // But we follow the API structure
      if (editingSection) {
        await updateSection(editingSection.id, payload);
        notify({ tone: "success", title: "Section updated" });
      } else {
        await createSection(payload);
        notify({ tone: "success", title: "Section created" });
      }
      setSectionModalOpen(false);
      loadSections();
    } catch (err) {
      notify({ tone: "danger", title: "Save failed", description: getErrorMessage(err, "Unable to save section.") });
    } finally {
      setSectionSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (!deletePassword) {
      notify({ tone: "warning", title: "Password required", description: "Please enter your password to confirm deletion." });
      return;
    }
    setDeleteLoading(true);
    try {
      if (deleteTarget.type === 'subject') {
        await deleteSubject(deleteTarget.id, deletePassword);
        notify({ tone: "success", title: "Subject deleted" });
        loadSubjects();
      } else {
        await deleteSection(deleteTarget.id, deletePassword);
        notify({ tone: "success", title: "Section deleted" });
        loadSections();
      }
      setDeleteTarget(null);
      setDeletePassword("");
    } catch (err) {
      notify({ tone: "danger", title: "Delete failed", description: getErrorMessage(err, "Unable to delete item.") });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader 
          title={<><Layers3 className="h-5 w-5" />Subjects & Sections</>}
          description="Manage educational components for your colleges and majors."
        />
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* SUBJECTS COLUMN */}
        <Card className="flex flex-col h-[calc(100vh-280px)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex flex-col">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Subjects
              </CardTitle>
              {!loadingSubjects && (
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                  Academic catalog
                </p>
              )}
            </div>
            {!loadingSubjects && (
              <div className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 shadow-sm transition-all hover:bg-primary/15">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary leading-none">
                  {filteredSubjects.length} {filteredSubjects.length === 1 ? 'Subject' : 'Subjects'} Found
                </p>
              </div>
            )}
            <Button size="sm" onClick={() => openSubjectModal()} className="h-8">
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search subjects..." 
                className="pl-9"
                value={subjectQuery}
                onChange={(e) => setSubjectQuery(e.target.value)}
              />
            </div>
            
            <div className="flex-1 overflow-auto rounded-md border border-border">
              {loadingSubjects ? (
                 <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                 </div>
              ) : filteredSubjects.length ? (
                <Table>
                  <THead>
                    <TR>
                      <TH><BookOpen className="h-4 w-4 mr-2 inline" />Name</TH>
                      <TH><GraduationCap className="h-4 w-4 mr-2 inline" />Major</TH>
                      <TH className="text-right"><Edit2 className="h-4 w-4 mr-2 inline" />Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {filteredSubjects.map((s) => {
                      const hasCover = !!s.cover_image_url;
                      return (
                        <TR
                          key={s.id}
                          className={hasCover ? "relative overflow-hidden group border-b-0" : ""}
                          style={
                            hasCover
                              ? {
                                  backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.85), rgba(0,0,0,0.4), rgba(0,0,0,0.85)), url(${s.cover_image_url})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                  height: "72px",
                                }
                              : undefined
                          }
                        >
                          <TD className={hasCover ? "relative z-10 py-4" : ""}>
                            <div className={`px-3 py-1 rounded-lg inline-block ${hasCover ? "bg-black/40 backdrop-blur-md border border-white/10" : ""}`}>
                              <div className={`font-bold ${hasCover ? "text-white text-base tracking-tight" : ""}`}>{s.name}</div>
                              <div className={`text-[10px] font-black uppercase tracking-widest ${hasCover ? "text-white/70" : "text-muted-foreground"}`}>{s.code || "No code"}</div>
                            </div>
                          </TD>
                          <TD className={hasCover ? "relative z-10" : ""}>
                            <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter ${hasCover ? "bg-white/10 backdrop-blur-sm text-white border border-white/10" : "bg-muted text-muted-foreground"}`}>
                              {s.major_name || "Global"}
                            </div>
                          </TD>
                          <TD className={`text-right ${hasCover ? "relative z-10 pr-4" : ""}`}>
                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <Button 
                                size="icon" 
                                variant={hasCover ? "default" : "ghost"} 
                                onClick={() => openSubjectModal(s)}
                                className={hasCover ? "h-8 w-8 bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-md" : "h-8 w-8"}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant={hasCover ? "danger" : "ghost"} 
                                className={hasCover ? "h-8 w-8 bg-red-500/80 hover:bg-red-500 border-0 backdrop-blur-md" : "h-8 w-8 text-danger hover:text-danger"}
                                onClick={() => setDeleteTarget({ type: 'subject', id: s.id, name: s.name })}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {subjectQuery ? "No matches found." : "No subjects available for this filter."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTIONS COLUMN */}
        <Card className="flex flex-col h-[calc(100vh-280px)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex flex-col">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-primary" /> Sections
              </CardTitle>
              {!loadingSections && (
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                  Enrollment blocks
                </p>
              )}
            </div>
            {!loadingSections && (
              <div className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 shadow-sm transition-all hover:bg-primary/15">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary leading-none">
                  {filteredSections.length} {filteredSections.length === 1 ? 'Section' : 'Sections'} Found
                </p>
              </div>
            )}
            <Button size="sm" onClick={() => openSectionModal()} className="h-8">
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search sections..." 
                className="pl-9"
                value={sectionQuery}
                onChange={(e) => setSectionQuery(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-auto rounded-md border border-border">
              {loadingSections ? (
                 <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                 </div>
              ) : filteredSections.length ? (
                <Table>
                  <THead>
                    <TR>
                      <TH><Layers3 className="h-4 w-4 mr-2 inline" />Name</TH>
                      <TH><GraduationCap className="h-4 w-4 mr-2 inline" />Major</TH>
                      <TH className="text-right"><Edit2 className="h-4 w-4 mr-2 inline" />Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {filteredSections.map((s) => (
                      <TR key={s.id} className="group transition-colors hover:bg-muted/30">
                        <TD>
                          <div className="font-bold text-sm tracking-tight">{s.name}</div>
                          <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">Year {s.year_level || "-"}</div>
                        </TD>
                        <TD>
                           <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter bg-muted text-muted-foreground border border-border/40">
                              {s.major_name || "Global"}
                           </div>
                        </TD>
                        <TD className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Button size="icon" variant="ghost" onClick={() => openSectionModal(s)} className="h-8 w-8">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-danger hover:text-danger" onClick={() => setDeleteTarget({ type: 'section', id: s.id, name: s.name })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                   {sectionQuery ? "No matches found." : "No sections available for this filter."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Modal */}
      <Modal
        open={subjectModalOpen}
        onClose={() => !subjectSaving && setSubjectModalOpen(false)}
        title={editingSubject ? "Edit Subject" : "New Subject"}
        description="Fill in the details for the subject."
      >
        <form onSubmit={onSaveSubject} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Subject Name</label>
            <Input 
              value={subjectForm.name} 
              onChange={e => setSubjectForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Data Structures"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-sm font-medium">Subject Code</label>
                <Input 
                  value={subjectForm.code} 
                  onChange={e => setSubjectForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. CS101"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Major</label>
                <select 
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={subjectForm.major_id}
                  onChange={e => setSubjectForm(f => ({ ...f, major_id: e.target.value }))}
                >
                  <option value="">Select Major</option>
                  {majors.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
                  ))}
                </select>
              </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Description (Optional)</label>
            <textarea 
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={subjectForm.description}
              onChange={e => setSubjectForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Cover Image (Optional)</label>
            <div className="space-y-2">
              {(subjectCoverPreviewUrl || subjectForm.cover_image_url) && (
                <div className="relative w-full h-32 rounded-md overflow-hidden border border-border">
                  <img 
                    src={subjectCoverPreviewUrl || subjectForm.cover_image_url} 
                    alt="Cover preview" 
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="absolute top-2 right-2 h-6 w-6 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      setSubjectCoverFile(null);
                      setSubjectCoverPreviewUrl(null);
                      setSubjectForm((f) => ({ ...f, cover_image_url: "" }));
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={subjectSaving || imageUploading}
                  className="flex-1"
                />
                {(subjectSaving || imageUploading) && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    {imageUploading ? "Uploading..." : "Saving..."}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setSubjectModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={subjectSaving || imageUploading}>
              {imageUploading ? "Uploading..." : (subjectSaving ? "Saving..." : "Save Subject")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Section Modal */}
      <Modal
        open={sectionModalOpen}
        onClose={() => !sectionSaving && setSectionModalOpen(false)}
        title={editingSection ? "Edit Section" : "New Section"}
        description="Fill in the details for the section."
      >
        <form onSubmit={onSaveSection} className="space-y-4">
          {editingSection && (
             <div className="space-y-1">
             <label className="text-sm font-medium">Section Name (Preview)</label>
             <Input value={editingSection.name} disabled />
           </div>
          )}
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-sm font-medium">Major</label>
                <select 
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={sectionForm.major_id}
                  onChange={e => setSectionForm(f => ({ ...f, major_id: e.target.value }))}
                >
                  <option value="">Select Major</option>
                  {majors.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Year Level</label>
                <Input 
                  type="number"
                  min={1}
                  max={10}
                  value={sectionForm.year_level} 
                  onChange={e => setSectionForm(f => ({ ...f, year_level: e.target.value }))}
                  placeholder="e.g. 1"
                />
              </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Section Code / Letter</label>
            <Input 
              value={sectionForm.section_code} 
              onChange={e => setSectionForm(f => ({ ...f, section_code: e.target.value }))}
              placeholder="e.g. A"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setSectionModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={sectionSaving}>{sectionSaving ? "Saving..." : "Save Section"}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteTarget(null);
            setDeletePassword("");
          }
        }}
        onConfirm={onConfirmDelete}
        loading={deleteLoading}
        title={`Delete ${deleteTarget?.type}`}
        description={
          <div className="space-y-3">
            <p>Are you sure you want to delete <span className="font-bold">"{deleteTarget?.name}"</span>? This action cannot be undone and may affect linked classes.</p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirm Password</label>
              <Input 
                type="password" 
                placeholder="Enter your password" 
                value={deletePassword} 
                onChange={(e) => setDeletePassword(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        }
        variant="danger"
      />
    </div>
  );
}
