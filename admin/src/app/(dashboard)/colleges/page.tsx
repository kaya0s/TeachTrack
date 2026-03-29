"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, MoreVertical, Pencil, Plus, School, Trash2, Building2, BookOpen } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CriticalActionModal } from "@/components/ui/critical-action-modal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createCollege,
  createDepartment,
  createMajor,
  deleteCollege,
  deleteDepartment,
  deleteMajor,
  getColleges,
  getDepartments,
  getMajors,
  updateCollege,
  updateDepartment,
  updateMajor,
  uploadAdminMedia,
} from "@/features/admin/api";
import type { AdminCollege, AdminDepartment, AdminMajor } from "@/features/admin/types";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/errors";

type ModalMode = "create" | "edit";

/* ── tiny inline dropdown ── */
function ActionMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-8 z-50 min-w-[130px] rounded-lg border border-border bg-popover shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-t-lg"
            onClick={() => { setOpen(false); onEdit(); }}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-b-lg"
            onClick={() => { setOpen(false); onDelete(); }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function CollegesPage() {
  const { notify } = useToast();

  const [loading, setLoading] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingMajors, setLoadingMajors] = useState(false);

  const [query, setQuery] = useState("");

  const [colleges, setColleges] = useState<AdminCollege[]>([]);
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [majors, setMajors] = useState<AdminMajor[]>([]);

  const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const [collegeModalOpen, setCollegeModalOpen] = useState(false);
  const [collegeModalMode, setCollegeModalMode] = useState<ModalMode>("create");
  const [editingCollege, setEditingCollege] = useState<AdminCollege | null>(null);
  const [collegeName, setCollegeName] = useState("");
  const [collegeAcronym, setCollegeAcronym] = useState("");
  const [collegeLogoPath, setCollegeLogoPath] = useState("");

  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [departmentModalMode, setDepartmentModalMode] = useState<ModalMode>("create");
  const [editingDepartment, setEditingDepartment] = useState<AdminDepartment | null>(null);
  const [departmentName, setDepartmentName] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [departmentCoverImageUrl, setDepartmentCoverImageUrl] = useState("");

  const [majorModalOpen, setMajorModalOpen] = useState(false);
  const [majorModalMode, setMajorModalMode] = useState<ModalMode>("create");
  const [editingMajor, setEditingMajor] = useState<AdminMajor | null>(null);
  const [majorName, setMajorName] = useState("");
  const [majorCode, setMajorCode] = useState("");
  const [majorCoverImageUrl, setMajorCoverImageUrl] = useState("");

  const [uploadingField, setUploadingField] = useState<null | "collegeLogo" | "departmentCover" | "majorCover">(null);

  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "college"; id: number; label: string }
    | { type: "department"; id: number; label: string }
    | { type: "major"; id: number; label: string }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  const selectedCollege = useMemo(
    () => colleges.find((row) => row.id === selectedCollegeId) ?? null,
    [colleges, selectedCollegeId],
  );
  const selectedDepartment = useMemo(
    () => departments.find((row) => row.id === selectedDepartmentId) ?? null,
    [departments, selectedDepartmentId],
  );
  const collegeLabel = colleges.length === 1 ? "College" : "Colleges";
  const normalizedSearch = query.trim().toLowerCase();
  const filteredCollegeOptions = useMemo(() => {
    if (!normalizedSearch) return colleges;
    return colleges.filter((row) => {
      const majorsText = (row.majors ?? [])
        .map((major) => `${major.name} ${major.code} ${major.department_name ?? ""}`)
        .join(" ");
      return `${row.name} ${row.acronym ?? ""} ${majorsText}`.toLowerCase().includes(normalizedSearch);
    });
  }, [colleges, normalizedSearch]);
  const filteredDepartments = useMemo(() => {
    if (!normalizedSearch) return departments;
    return departments.filter((row) =>
      `${row.name} ${row.code ?? ""}`.toLowerCase().includes(normalizedSearch),
    );
  }, [departments, normalizedSearch]);
  const filteredMajors = useMemo(() => {
    if (!normalizedSearch) return majors;
    return majors.filter((row) =>
      `${row.name} ${row.code} ${row.department_name ?? ""} ${row.college_name ?? ""}`.toLowerCase().includes(normalizedSearch),
    );
  }, [majors, normalizedSearch]);

  const loadColleges = useCallback(async () => {
    setLoading(true);
    try {
      const params = "?limit=500";
      const res = await getColleges(params);
      const rows: AdminCollege[] = res.items ?? [];
      setColleges(rows);
      if (rows.length === 0) {
        setSelectedCollegeId(null);
        setSelectedDepartmentId(null);
        setDepartments([]);
        setMajors([]);
      } else {
        setSelectedCollegeId((prev) =>
          prev && rows.some((c: AdminCollege) => c.id === prev) ? prev : rows[0].id,
        );
      }
    } catch (error) {
      notify({ tone: "danger", title: "Load failed", description: getErrorMessage(error, "Unable to load colleges.") });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const loadDepartments = useCallback(async (collegeId: number | null) => {
    if (!collegeId) { setDepartments([]); setSelectedDepartmentId(null); return; }
    setLoadingDepartments(true);
    try {
      const res = await getDepartments(collegeId, "?limit=500");
      const rows: AdminDepartment[] = res.items ?? [];
      setDepartments(rows);
      setSelectedDepartmentId((prev) =>
        prev && rows.some((d: AdminDepartment) => d.id === prev) ? prev : rows[0]?.id ?? null,
      );
    } catch (error) {
      notify({ tone: "danger", title: "Load failed", description: getErrorMessage(error, "Unable to load departments.") });
    } finally {
      setLoadingDepartments(false);
    }
  }, [notify]);

  const loadMajors = useCallback(async (departmentId: number | null) => {
    if (!departmentId) { setMajors([]); return; }
    setLoadingMajors(true);
    try {
      const res = await getMajors(undefined, "?limit=500", departmentId);
      setMajors(res.items ?? []);
    } catch (error) {
      notify({ tone: "danger", title: "Load failed", description: getErrorMessage(error, "Unable to load majors.") });
    } finally {
      setLoadingMajors(false);
    }
  }, [notify]);

  useEffect(() => { loadColleges(); }, [loadColleges]);
  useEffect(() => { loadDepartments(selectedCollegeId); }, [selectedCollegeId, loadDepartments]);
  useEffect(() => { loadMajors(selectedDepartmentId); }, [selectedDepartmentId, loadMajors]);
  useEffect(() => {
    if (filteredCollegeOptions.length === 0) return;
    if (!selectedCollegeId || !filteredCollegeOptions.some((row) => row.id === selectedCollegeId)) {
      setSelectedCollegeId(filteredCollegeOptions[0].id);
    }
  }, [filteredCollegeOptions, selectedCollegeId]);

  const onSearchSubmit = async (event: FormEvent) => { event.preventDefault(); await loadColleges(); };

  /* ── open helpers ── */
  const openCreateCollege = () => {
    setCollegeModalMode("create"); setEditingCollege(null);
    setCollegeName(""); setCollegeAcronym(""); setCollegeLogoPath("");
    setCollegeModalOpen(true);
  };
  const openEditCollege = (row: AdminCollege) => {
    setCollegeModalMode("edit"); setEditingCollege(row);
    setCollegeName(row.name); setCollegeAcronym(row.acronym ?? "");
    setCollegeLogoPath(row.logo_path ?? "");
    setCollegeModalOpen(true);
  };
  const openCreateDepartment = () => {
    if (!selectedCollegeId) { notify({ tone: "warning", title: "Select a college", description: "Choose a college before creating a department." }); return; }
    setDepartmentModalMode("create"); setEditingDepartment(null);
    setDepartmentName(""); setDepartmentCode(""); setDepartmentCoverImageUrl("");
    setDepartmentModalOpen(true);
  };
  const openEditDepartment = (row: AdminDepartment) => {
    setDepartmentModalMode("edit"); setEditingDepartment(row);
    setDepartmentName(row.name); setDepartmentCode(row.code ?? ""); setDepartmentCoverImageUrl(row.cover_image_url ?? "");
    setDepartmentModalOpen(true);
  };
  const openCreateMajor = () => {
    if (!selectedDepartmentId) { notify({ tone: "warning", title: "Select a department", description: "Choose a department before creating a major." }); return; }
    setMajorModalMode("create"); setEditingMajor(null);
    setMajorName(""); setMajorCode(""); setMajorCoverImageUrl("");
    setMajorModalOpen(true);
  };
  const openEditMajor = (row: AdminMajor) => {
    setMajorModalMode("edit"); setEditingMajor(row);
    setMajorName(row.name); setMajorCode(row.code); setMajorCoverImageUrl(row.cover_image_url ?? "");
    setMajorModalOpen(true);
  };

  /* ── submits ── */
  const submitCollege = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true);
    try {
      if (collegeModalMode === "create") {
        await createCollege({ name: collegeName.trim(), acronym: collegeAcronym.trim() || null, logo_path: collegeLogoPath.trim() || null });
        notify({ tone: "success", title: "College created" });
      } else if (editingCollege) {
        await updateCollege(editingCollege.id, { name: collegeName.trim(), acronym: collegeAcronym.trim() || null, logo_path: collegeLogoPath.trim() || null });
        notify({ tone: "success", title: "College updated" });
      }
      setCollegeModalOpen(false); await loadColleges();
    } catch (error) {
      notify({ tone: "danger", title: "Save failed", description: getErrorMessage(error, "Unable to save college.") });
    } finally { setSubmitting(false); }
  };

  const submitDepartment = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCollegeId && departmentModalMode === "create") return;
    setSubmitting(true);
    try {
      if (departmentModalMode === "create") {
        await createDepartment({ college_id: selectedCollegeId, name: departmentName.trim(), code: departmentCode.trim() || null, cover_image_url: departmentCoverImageUrl.trim() || null });
        notify({ tone: "success", title: "Department created" });
      } else if (editingDepartment) {
        await updateDepartment(editingDepartment.id, { name: departmentName.trim(), code: departmentCode.trim() || null, cover_image_url: departmentCoverImageUrl.trim() || null });
        notify({ tone: "success", title: "Department updated" });
      }
      setDepartmentModalOpen(false); await loadDepartments(selectedCollegeId);
    } catch (error) {
      notify({ tone: "danger", title: "Save failed", description: getErrorMessage(error, "Unable to save department.") });
    } finally { setSubmitting(false); }
  };

  const submitMajor = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedDepartmentId && majorModalMode === "create") return;
    setSubmitting(true);
    try {
      if (majorModalMode === "create") {
        await createMajor({ department_id: selectedDepartmentId, name: majorName.trim(), code: majorCode.trim(), cover_image_url: majorCoverImageUrl.trim() || null });
        notify({ tone: "success", title: "Major created" });
      } else if (editingMajor) {
        await updateMajor(editingMajor.id, { name: majorName.trim(), code: majorCode.trim(), cover_image_url: majorCoverImageUrl.trim() || null });
        notify({ tone: "success", title: "Major updated" });
      }
      setMajorModalOpen(false); await loadMajors(selectedDepartmentId); await loadColleges();
    } catch (error) {
      notify({ tone: "danger", title: "Save failed", description: getErrorMessage(error, "Unable to save major.") });
    } finally { setSubmitting(false); }
  };

  async function onUploadAsset(file: File, target: "collegeLogo" | "departmentCover" | "majorCover") {
    setUploadingField(target);
    try {
      const entity = target === "majorCover" ? "major" : target === "departmentCover" ? "department" : "college";
      const result = await uploadAdminMedia(file, entity);
      const url = result.secure_url;
      if (target === "collegeLogo") setCollegeLogoPath(url);
      if (target === "departmentCover") setDepartmentCoverImageUrl(url);
      if (target === "majorCover") setMajorCoverImageUrl(url);

      let appliedImmediately = false;
      if (target === "collegeLogo" && collegeModalMode === "edit" && editingCollege) {
        await updateCollege(editingCollege.id, { logo_path: url });
        await loadColleges(); appliedImmediately = true;
      }
      if (target === "departmentCover" && departmentModalMode === "edit" && editingDepartment) {
        await updateDepartment(editingDepartment.id, { cover_image_url: url });
        await loadDepartments(selectedCollegeId); appliedImmediately = true;
      }
      if (target === "majorCover" && majorModalMode === "edit" && editingMajor) {
        await updateMajor(editingMajor.id, { cover_image_url: url });
        await loadMajors(selectedDepartmentId); appliedImmediately = true;
      }
      notify({ tone: "success", title: appliedImmediately ? "Image uploaded and applied" : "Image uploaded", description: appliedImmediately ? "Changes are now visible in the list." : "Click Save to persist this image." });
    } catch (error) {
      notify({ tone: "danger", title: "Upload failed", description: getErrorMessage(error, "Unable to upload image.") });
    } finally { setUploadingField(null); }
  }

  const confirmDelete = async (password: string) => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === "college") { await deleteCollege(deleteTarget.id, password); notify({ tone: "success", title: "College deleted" }); await loadColleges(); }
      if (deleteTarget.type === "department") { await deleteDepartment(deleteTarget.id, password); notify({ tone: "success", title: "Department deleted" }); await loadDepartments(selectedCollegeId); }
      if (deleteTarget.type === "major") { await deleteMajor(deleteTarget.id, password); notify({ tone: "success", title: "Major deleted" }); await loadMajors(selectedDepartmentId); await loadColleges(); }
      setDeleteTarget(null);
    } catch (error) {
      notify({ tone: "danger", title: "Delete failed", description: getErrorMessage(error, "Unable to delete selected item.") });
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <>
            <School className="h-5 w-5" />
            {collegeLabel}
          </>
        }
        description="Hierarchy-first management for Colleges, Departments, and Majors."
      />

      {/* Search + Add */}
      <form onSubmit={onSearchSubmit} className="flex items-center gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search colleges, departments, majors..." className="max-w-sm" />
        <Button type="submit" variant="outline">Search</Button>
        <Button type="button" onClick={openCreateCollege}>
          <Plus className="mr-2 h-4 w-4" />
          Add College
        </Button>
      </form>

      <div className="grid gap-4 lg:grid-cols-3">

        {/* -- 1. Colleges -- */}
        <div className="space-y-3">
          <div className="text-center">
            <h2 className="text-base font-semibold tracking-tight">{collegeLabel}</h2>
            {colleges.length > 1 ? <p className="text-xs text-muted-foreground">Select a college to drill down</p> : null}
          </div>
          <div className="space-y-3">
            {loading ? (
              [1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
            ) : filteredCollegeOptions.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {query.trim() ? `No colleges, departments, or majors match "${query.trim()}".` : "No colleges found."}
              </p>
            ) : (
              <>
                {filteredCollegeOptions.length > 1 ? (
                  <select
                    value={selectedCollegeId ?? ""}
                    onChange={(e) => setSelectedCollegeId(e.target.value ? Number(e.target.value) : null)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {filteredCollegeOptions.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.acronym ? `${row.acronym} - ${row.name}` : row.name}
                      </option>
                    ))}
                  </select>
                ) : null}

                {selectedCollege ? (
                  <div className="p-2">
                    <div className="mb-3 flex items-center justify-end">
                      <ActionMenu
                        onEdit={() => openEditCollege(selectedCollege)}
                        onDelete={() => setDeleteTarget({ type: "college", id: selectedCollege.id, label: selectedCollege.name })}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-52 w-52 items-center justify-center overflow-hidden rounded-full border-4 border-primary/15 bg-muted shadow-md">
                        {selectedCollege.logo_path ? (
                          <img src={selectedCollege.logo_path} alt={`${selectedCollege.name} logo`} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-4xl font-semibold text-muted-foreground">
                            {selectedCollege.acronym?.slice(0, 2) ?? selectedCollege.name.slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold leading-tight">{selectedCollege.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedCollege.acronym ?? "No acronym"}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 rounded-md border border-border/70 px-2 py-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {departments.length} dept{departments.length !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1 rounded-md border border-border/70 px-2 py-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {selectedCollege.majors?.length ?? 0} major{(selectedCollege.majors?.length ?? 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
        {/* ── 2. Departments ── */}
        <Card>
          <CardHeader className="flex flex-col items-center gap-1 pb-3">
            <CardTitle className="text-base font-semibold tracking-tight">Departments</CardTitle>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {selectedCollege ? `Under ${selectedCollege.name}` : "Select a college first"}
              </p>
              <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={openCreateDepartment}>
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {!selectedCollege ? (
              <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Select a college to manage departments.
              </p>
            ) : loadingDepartments ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : filteredDepartments.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {query.trim() ? `No departments match "${query.trim()}" under ${selectedCollege.name}.` : `No departments under ${selectedCollege.name}.`}
              </p>
            ) : (
              filteredDepartments.map((row) => (
                <div
                  key={row.id}
                  className={`group relative overflow-hidden rounded-xl border p-0 ${
                    selectedDepartmentId === row.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <button type="button" className="relative w-full text-left" onClick={() => setSelectedDepartmentId(row.id)}>
                    <div className="relative min-h-[120px] w-full">
                      {row.cover_image_url ? (
                        <img src={row.cover_image_url} alt={row.name} className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-muted">
                          <div className="flex h-full w-full items-center justify-center">
                            <Building2 className="h-10 w-10 text-muted-foreground/70" />
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
                      <div className="relative flex min-h-[120px] flex-col justify-end px-3 py-3">
                        <p className="font-semibold text-white">{row.name}</p>
                        <p className="text-xs text-white/85">{row.code ?? "No code"}</p>
                      </div>
                    </div>
                  </button>
                  <div className="absolute right-2 top-2 z-10" onClick={(e) => e.stopPropagation()}>
                    <ActionMenu
                      onEdit={() => openEditDepartment(row)}
                      onDelete={() => setDeleteTarget({ type: "department", id: row.id, label: row.name })}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* ── 3. Majors ── */}
        <Card>
          <CardHeader className="flex flex-col items-center gap-1 pb-3">
            <CardTitle className="text-base font-semibold tracking-tight">Majors</CardTitle>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {selectedDepartment ? `Under ${selectedDepartment.name}` : "Select a department first"}
              </p>
              <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={openCreateMajor}>
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {!selectedDepartment ? (
              <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Select a department to manage majors.
              </p>
            ) : loadingMajors ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : filteredMajors.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {query.trim() ? `No majors match "${query.trim()}" under ${selectedDepartment.name}.` : `No majors under ${selectedDepartment.name}.`}
              </p>
            ) : (
              filteredMajors.map((row) => (
                <div key={row.id} className="group relative overflow-hidden rounded-xl border border-border p-0">
                  <div className="relative min-h-[110px] w-full">
                    {row.cover_image_url ? (
                      <img src={row.cover_image_url} alt={row.name} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-muted">
                        <div className="flex h-full w-full items-center justify-center">
                          <BookOpen className="h-10 w-10 text-muted-foreground/70" />
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
                    <div className="relative flex min-h-[110px] flex-col justify-end px-3 py-3">
                      <p className="font-semibold text-white">{row.name}</p>
                      <p className="text-xs text-white/85">{row.code}</p>
                    </div>
                  </div>
                  <div className="absolute right-2 top-2 z-10">
                    <ActionMenu
                      onEdit={() => openEditMajor(row)}
                      onDelete={() => setDeleteTarget({ type: "major", id: row.id, label: row.name })}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hierarchy Context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-sm">Hierarchy Context</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border p-3">
            <p className="mb-1 text-xs uppercase text-muted-foreground">College</p>
            <p className="font-semibold">{selectedCollege?.name ?? "None selected"}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="mb-1 text-xs uppercase text-muted-foreground">Department</p>
            <p className="font-semibold">{selectedDepartment?.name ?? "None selected"}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="mb-1 text-xs uppercase text-muted-foreground">Majors</p>
            <p className="font-semibold">{majors.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Modals ── */}
      <Modal
        open={collegeModalOpen}
        onClose={() => !submitting && setCollegeModalOpen(false)}
        title={collegeModalMode === "create" ? "Create College" : "Edit College"}
        description="College record for top-level hierarchy."
      >
        <form onSubmit={submitCollege} className="space-y-3">
          <label className="space-y-1 text-sm"><span>Name</span><Input value={collegeName} onChange={(e) => setCollegeName(e.target.value)} required /></label>
          <label className="space-y-1 text-sm"><span>Acronym</span><Input value={collegeAcronym} onChange={(e) => setCollegeAcronym(e.target.value.toUpperCase())} /></label>
          <label className="space-y-1 text-sm"><span>Logo URL</span><Input value={collegeLogoPath} onChange={(e) => setCollegeLogoPath(e.target.value)} placeholder="https://..." /></label>
          {collegeLogoPath ? <div className="flex items-center gap-2"><img src={collegeLogoPath} alt="College logo preview" className="h-12 w-12 rounded-full border border-border object-cover" /><span className="text-xs text-muted-foreground">Logo preview</span></div> : null}
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-accent">
              <ImagePlus className="mr-1 h-3.5 w-3.5" />Upload Logo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void onUploadAsset(file, "collegeLogo"); }} />
            </label>
            {uploadingField === "collegeLogo" ? <span className="text-xs text-muted-foreground">Uploading...</span> : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCollegeModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={departmentModalOpen}
        onClose={() => !submitting && setDepartmentModalOpen(false)}
        title={departmentModalMode === "create" ? "Create Department" : "Edit Department"}
        description="Department belongs to selected college."
      >
        <form onSubmit={submitDepartment} className="space-y-3">
          <div className="rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">College: {selectedCollege?.name ?? "-"}</div>
          <label className="space-y-1 text-sm"><span>Name</span><Input value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} required /></label>
          <label className="space-y-1 text-sm"><span>Code</span><Input value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value.toUpperCase())} /></label>
          <label className="space-y-1 text-sm"><span>Cover Image URL</span><Input value={departmentCoverImageUrl} onChange={(e) => setDepartmentCoverImageUrl(e.target.value)} placeholder="https://..." /></label>
          {departmentCoverImageUrl ? <img src={departmentCoverImageUrl} alt="Department cover preview" className="h-20 w-full rounded-md object-cover" /> : null}
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-accent">
              <ImagePlus className="mr-1 h-3.5 w-3.5" />Upload Cover
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void onUploadAsset(file, "departmentCover"); }} />
            </label>
            {uploadingField === "departmentCover" ? <span className="text-xs text-muted-foreground">Uploading...</span> : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDepartmentModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={majorModalOpen}
        onClose={() => !submitting && setMajorModalOpen(false)}
        title={majorModalMode === "create" ? "Create Major" : "Edit Major"}
        description="Major belongs to selected department."
      >
        <form onSubmit={submitMajor} className="space-y-3">
          <div className="rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">Department: {selectedDepartment?.name ?? "-"}</div>
          <label className="space-y-1 text-sm"><span>Name</span><Input value={majorName} onChange={(e) => setMajorName(e.target.value)} required /></label>
          <label className="space-y-1 text-sm"><span>Code</span><Input value={majorCode} onChange={(e) => setMajorCode(e.target.value.toUpperCase())} required /></label>
          <label className="space-y-1 text-sm"><span>Cover Image URL</span><Input value={majorCoverImageUrl} onChange={(e) => setMajorCoverImageUrl(e.target.value)} placeholder="https://..." /></label>
          {majorCoverImageUrl ? <img src={majorCoverImageUrl} alt="Major cover preview" className="h-20 w-full rounded-md object-cover" /> : null}
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-accent">
              <ImagePlus className="mr-1 h-3.5 w-3.5" />Upload Cover
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void onUploadAsset(file, "majorCover"); }} />
            </label>
            {uploadingField === "majorCover" ? <span className="text-xs text-muted-foreground">Uploading...</span> : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setMajorModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>

      <CriticalActionModal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`Delete ${deleteTarget?.type ?? "item"}`}
        description={`Delete "${deleteTarget?.label ?? ""}"? This cannot be undone and will fail if related records exist.`}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
}
