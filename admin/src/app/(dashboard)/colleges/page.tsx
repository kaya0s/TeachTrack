"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, School, Trash2, Edit2, BookType, GraduationCap, Info, MoreHorizontal } from "lucide-react";
import { AlertDialog } from "@/components/ui/alert-dialog";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  createCollege,
  deleteCollege,
  getCollegeDetails,
  getColleges,
  updateCollege,
} from "@/features/admin/api";
import type { AdminCollege, AdminCollegeDetails, AdminMajor } from "@/features/admin/types";
import { SearchBar } from "@/components/ui/search-bar";
import { getErrorMessage } from "@/lib/errors";
import { Users, Calendar, Activity, FileText, Layout } from "lucide-react";

/**
 * CollegesPage Component
 * Displays academic colleges in a premium carousel with redesigned cards.
 */
export default function CollegesPage() {
  const { notify } = useToast();
  const [items, setItems] = useState<AdminCollege[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCollege, setActiveCollege] = useState<AdminCollege | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Detail Modal State
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState<AdminCollegeDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [name, setName] = useState("");
  const [acronym, setAcronym] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Track which card has the menu open
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = query ? `?q=${encodeURIComponent(query)}` : "";
      const res = await getColleges(params);
      setItems(res.items || []);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load colleges"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  function openCreate() {
    setName("");
    setAcronym("");
    setFormError(null);
    setCreateOpen(true);
  }

  function openEdit(college: AdminCollege) {
    setActiveCollege(college);
    setName(college.name);
    setAcronym(college.acronym || "");
    setFormError(null);
    setEditOpen(true);
    setOpenMenuId(null);
  }

  function openDelete(college: AdminCollege) {
    setActiveCollege(college);
    setDeleteConfirmOpen(true);
    setOpenMenuId(null);
  }

  async function openDetails(collegeId: number) {
    setDetailsOpen(true);
    setDetails(null);
    setLoadingDetails(true);
    try {
      const data = await getCollegeDetails(collegeId);
      setDetails(data);
    } catch (err) {
      notify({
        tone: "danger",
        title: "Load failed",
        description: getErrorMessage(err),
      });
      setDetailsOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await createCollege({ name: name.trim(), acronym: acronym.trim() || null });
      notify({ tone: "success", title: "College created" });
      setCreateOpen(false);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!activeCollege || !name.trim()) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await updateCollege(activeCollege.id, {
        name: name.trim(),
        acronym: acronym.trim() || null,
      });
      notify({ tone: "success", title: "College updated" });
      setEditOpen(false);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!activeCollege) return;
    setSubmitting(true);
    try {
      await deleteCollege(activeCollege.id);
      notify({ tone: "success", title: "College deleted" });
      setDeleteConfirmOpen(false);
      await load();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Delete failed",
        description: getErrorMessage(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-12 pb-20">
      <div className="flex flex-wrap items-start justify-between gap-4 px-4">
        <PageHeader
          title={<><School className="h-6 w-6" />Colleges</>}
          description="Manage academic colleges and organizational structure."
        />
        <Button onClick={openCreate} className="rounded-xl shadow-xl shadow-primary/20">
          <Plus className="mr-2 h-5 w-5" />
          Add College
        </Button>
      </div>

      <div className="flex max-w-md items-center gap-3 px-4">
        <SearchBar
          placeholder="Search colleges..."
          value={query}
          onChange={setQuery}
          onSubmit={onSearch}
        />
      </div>

      {error ? (
        <div className="px-4">
          <Card className="border-danger/20 bg-danger/5">
            <CardContent className="flex items-center gap-3 py-4 text-danger">
              <Info className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="relative px-6 sm:px-16" onClick={() => setOpenMenuId(null)}>
        {loading ? (
          <div className="flex gap-6 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[480px] min-w-[320px] flex-1 rounded-xl" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-6">
              {items.map((college) => (
                <CarouselItem key={college.id} className="pl-6 md:basis-1/2 lg:basis-1/3 xl:basis-1/3">
                  <Card
                    onClick={() => openDetails(college.id)}
                    className="group relative flex h-[480px] cursor-pointer flex-col overflow-hidden border-border/40 bg-card/40 backdrop-blur-xl transition-all hover:bg-card/60 hover:shadow-2xl hover:shadow-primary/5 active:scale-[0.99] rounded-xl"
                  >

                    {/* Actions Menu */}
                    <div className="absolute right-6 top-6 z-20">
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === college.id ? null : college.id);
                          }}
                          className="h-9 w-9 rounded-full bg-background/20 border-border/20 backdrop-blur hover:bg-background/40"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>

                        {openMenuId === college.id && (
                          <div className="absolute right-0 top-11 w-32 origin-top-right rounded-xl border border-border/50 bg-background/90 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in duration-200">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEdit(college); }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold transition-colors hover:bg-muted"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              Edit Profile
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openDelete(college); }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-danger transition-colors hover:bg-danger/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <CardContent className="flex flex-1 flex-col items-center p-10 text-center">
                      {/* Logo Section (Circular, No overlay) */}
                      <div className="mb-8">
                        <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted/40 shadow-xl transition-transform group-hover:scale-105">
                          {college.logo_path ? (
                            <img src={college.logo_path} alt={college.name} className="h-full w-full object-cover" />
                          ) : (
                            <GraduationCap className="h-16 w-16 text-muted-foreground/20" />
                          )}
                        </div>
                      </div>

                      {/* Header Info */}
                      <div className="space-y-3">
                        <h3 className="text-2xl font-black text-foreground leading-tight tracking-tight line-clamp-2 min-h-[4rem]">{college.name}</h3>
                        {college.acronym && (
                          <div className="flex justify-center">
                            <span className="inline-block rounded-full bg-primary/10 px-5 py-1.5 text-[11px] font-black uppercase tracking-[0.3em] text-primary">
                              {college.acronym}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content Separator */}
                      <div className="mt-10 w-full space-y-5">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/40 to-border/40" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 whitespace-nowrap px-2">Academic Programs</span>
                          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-border/40 to-border/40" />
                        </div>

                        <div className="flex flex-wrap justify-center gap-2">
                          {college.majors && college.majors.length > 0 ? (
                            <>
                              {college.majors.slice(0, 5).map((major: AdminMajor) => (
                                <Badge key={major.id} tone="default" className="rounded-full border-border/40 bg-muted/20 px-3.5 py-1 text-[10px] font-bold text-muted-foreground transition-all hover:bg-primary/5 hover:text-primary hover:border-primary/20">
                                  {major.code}
                                </Badge>
                              ))}
                              {college.majors.length > 5 && (
                                <Badge tone="default" className="rounded-full border-border/40 bg-muted/20 px-3.5 py-1 text-[10px] font-bold text-muted-foreground">
                                  +{college.majors.length - 5}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-1 opacity-10">
                              <BookType className="h-5 w-5" />
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Empty Records</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Metadata */}
                      <div className="mt-auto pt-8 opacity-10 group-hover:opacity-30 transition-opacity">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Institutional ID: {college.id.toString().padStart(3, '0')}</p>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-6 h-12 w-12 border-border/40 bg-card/50 shadow-xl backdrop-blur-sm hover:bg-card hidden sm:flex" />
            <CarouselNext className="-right-6 h-12 w-12 border-border/40 bg-card/50 shadow-xl backdrop-blur-sm hover:bg-card hidden sm:flex" />
          </Carousel>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-border/40 bg-muted/5 py-40 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted/20">
              <School className="h-12 w-12 text-muted-foreground/10" />
            </div>
            <h3 className="text-xl font-bold text-foreground">No Academic Records</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground/60">Try searching for something else or create a new college record.</p>
            <Button variant="outline" className="mt-10 rounded-xl px-10" onClick={() => { setQuery(""); load(); }}>
              Show All Colleges
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => !submitting && setCreateOpen(false)}
        title="Register New College"
        description="Add a new academic unit to the institutional directory."
      >
        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/5 p-3 text-xs font-bold text-danger">
              <Info className="h-4 w-4" />
              {formError}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Name</label>
            <Input
              placeholder="e.g. College of Engineering"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-12 border-border/60 rounded-xl"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Institutional Code (Acronym)</label>
            <Input
              placeholder="e.g. COE"
              value={acronym}
              onChange={(e) => setAcronym(e.target.value)}
              className="h-12 border-border/60 font-mono uppercase tracking-widest rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={submitting}
              className="px-6 rounded-xl"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()} className="px-8 shadow-lg shadow-primary/10 rounded-xl">
              {submitting ? "Saving..." : "Create Record"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onClose={() => !submitting && setEditOpen(false)}
        title="Update College Profile"
        description="Modify the existing institutional records for this college."
      >
        <form onSubmit={handleUpdate} className="space-y-4 pt-2">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/5 p-3 text-xs font-bold text-danger">
              <Info className="h-4 w-4" />
              {formError}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-12 border-border/60 rounded-xl"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Institutional Code</label>
            <Input
              value={acronym}
              onChange={(e) => setAcronym(e.target.value)}
              className="h-12 border-border/60 font-mono uppercase tracking-widest rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={submitting}
              className="px-6 rounded-xl"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()} className="px-8 shadow-lg shadow-primary/10 rounded-xl">
              {submitting ? "Updating..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="College Report & Insights"
        description="Detailed performance metrics and institutional overview."
        className="max-w-4xl"
      >
        {loadingDetails ? (
          <div className="space-y-6 py-10">
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : details ? (
          <div className="space-y-8 py-4">
            {/* Report Header */}
            <div className="flex flex-col md:flex-row items-center gap-8 border-b border-border/40 pb-8">
              <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-background bg-card shadow-2xl">
                {details.logo_path ? (
                  <img src={details.logo_path} alt={details.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <School className="h-12 w-12 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 text-center md:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                  <h2 className="text-3xl font-black tracking-tighter text-foreground">{details.name}</h2>
                  {details.acronym && (
                    <Badge className="bg-primary/10 text-primary font-black px-4 py-1 text-xs">
                      {details.acronym}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  Institution ID: {details.id.toString().padStart(4, '0')}
                </p>
              </div>
            </div>

            {/* Core Metrics Bento Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border/40 bg-card/40 p-6 backdrop-blur-md">
                <Users className="mb-4 h-6 w-6 text-primary" />
                <h4 className="text-2xl font-black text-foreground">{details.teachers_count}</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Faculty Members</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-card/40 p-6 backdrop-blur-md text-info">
                <Activity className="mb-4 h-6 w-6 text-info" />
                <h4 className="text-2xl font-black text-foreground">{details.active_sessions}</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Active Sessions</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-card/40 p-6 backdrop-blur-md">
                <Calendar className="mb-4 h-6 w-6 text-warning" />
                <h4 className="text-2xl font-black text-foreground">{details.total_sessions}</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Lifetime Sessions</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-card/40 p-6 backdrop-blur-md">
                <Layout className="mb-4 h-6 w-6 text-primary" />
                <h4 className="text-2xl font-black text-foreground">{details.avg_sessions_per_teacher}</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Avg. Sess / Faculty</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Teachers List section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" /> Faculty Directory
                  </h4>
                  <Badge tone="default" className="text-[10px]">{details.teachers.length}</Badge>
                </div>
                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {details.teachers.length > 0 ? (
                    details.teachers.map(teacher => (
                      <div key={teacher.id} className="flex items-center gap-3 rounded-lg border border-border/20 bg-muted/10 p-3 transition-colors hover:bg-muted/20">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border/40 bg-muted">
                          {teacher.profile_picture_url ? (
                            <img src={teacher.profile_picture_url} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-bold">
                              {teacher.fullname?.charAt(0) || teacher.email.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-black text-foreground">{teacher.fullname}</p>
                          <p className="truncate text-[10px] font-bold text-muted-foreground/60">{teacher.email}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-10 text-center text-xs font-bold text-muted-foreground/40 italic">No faculty members assigned.</p>
                  )}
                </div>
              </div>

              {/* Majors Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Academic Majors
                  </h4>
                  <Badge tone="default" className="text-[10px]">{details.majors.length}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {details.majors.length > 0 ? (
                    details.majors.map(major => (
                      <div key={major.id} className="group relative flex items-center gap-3 rounded-xl border border-border/40 bg-card/50 p-4 transition-all hover:border-primary/40 hover:bg-card">
                        <div>
                          <p className="text-xs font-black text-foreground tracking-tight">{major.name}</p>
                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{major.code}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="w-full py-10 text-center text-xs font-bold text-muted-foreground/40 italic">No majors found.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Confirm Deletion"
        description={`Warning: You are about to permanently delete "${activeCollege?.name}". This record cannot be restored and will fail if linked majors or teachers exist.`}
        confirmText="Confirm Delete"
        variant="danger"
        loading={submitting}
      />
    </div>
  );
}
