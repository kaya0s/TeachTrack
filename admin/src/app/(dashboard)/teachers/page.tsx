"use client";

import { FormEvent, useEffect, useState } from "react";
import { KeyRound, ShieldCheck, ShieldOff, Trash2, Users } from "lucide-react";
import { AlertDialog } from "@/components/ui/alert-dialog";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { getTeachers, patchUser, resetPassword } from "@/features/admin/api";
import type { AdminTeacher } from "@/features/admin/types";
import { SearchBar } from "@/components/ui/search-bar";
import { getCurrentActorUserId } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

export default function TeachersPage() {
  const { notify } = useToast();
  const [items, setItems] = useState<AdminTeacher[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTeacher, setActiveTeacher] = useState<AdminTeacher | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [pendingActiveState, setPendingActiveState] = useState<boolean | null>(null);

  const currentActorUserId = getCurrentActorUserId();

  async function load() {
    setLoading(true);
    try {
      const params = query ? `?q=${encodeURIComponent(query)}` : "";
      const res = await getTeachers(params);
      setItems(res.items);
      setError(null);
    } catch (err) {
      const message = getErrorMessage(err, "Failed to load teachers");
      setError(message);
      notify({ tone: "danger", title: "Teachers load failed", description: message });
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

  function openTeacherDetails(teacher: AdminTeacher) {
    setActiveTeacher(teacher);
    setDetailsOpen(true);
  }

  function onInitiateToggleStatus(teacher: AdminTeacher) {
    setActiveTeacher(teacher);
    setPendingActiveState(!teacher.is_active);
    setConfirmStatusOpen(true);
  }

  async function onToggleTeacherStatus() {
    if (!activeTeacher) return;
    setResetting(true);
    try {
      await patchUser(activeTeacher.id, { is_active: pendingActiveState! });
      notify({
        tone: "success",
        title: `Teacher ${pendingActiveState ? "enabled" : "disabled"}`,
        description: activeTeacher.username,
      });
      await load();
      setConfirmStatusOpen(false);
    } catch (err) {
      notify({
        tone: "danger",
        title: "Status update failed",
        description: getErrorMessage(err, "Could not update teacher status."),
      });
    } finally {
      setResetting(false);
    }
  }

  async function onResetTeacherPassword() {
    if (!activeTeacher || newPassword.length < 8) return;
    setResetting(true);
    try {
      await resetPassword(activeTeacher.id, newPassword);
      notify({
        tone: "success",
        title: "Temporary password set",
        description: `Teacher: ${activeTeacher.username}`,
      });
      setResetModalOpen(false);
      setNewPassword("");
    } catch (err) {
      notify({
        tone: "danger",
        title: "Password reset failed",
        description: getErrorMessage(err, "Could not reset password."),
      });
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={<><Users className="h-5 w-5" />Teachers</>} description="Manage teacher accounts and classroom access states." />
      <Card>
        <CardContent className="pt-4">
          <div className="mb-4 max-w-lg">
            <SearchBar
              placeholder="Search teacher username or email..."
              value={query}
              onChange={setQuery}
              onSubmit={onSearch}
            />
          </div>
          {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
          ) : items.length ? (
            <Table>
              <THead><TR><TH className="w-16">ID</TH><TH className="w-10">Photo</TH><TH>Username</TH><TH>Email</TH><TH>Status</TH></TR></THead>
              <TBody>
                {items.map((teacher) => (
                  <TR
                    key={teacher.id}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => openTeacherDetails(teacher)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openTeacherDetails(teacher);
                      }
                    }}
                  >
                    <TD className="font-mono text-xs">{teacher.id}</TD>
                    <TD>
                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                        {teacher.profile_picture_url ? (
                          <img src={teacher.profile_picture_url} alt={teacher.username} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold uppercase text-muted-foreground">
                            {teacher.username.charAt(0)}
                          </span>
                        )}
                      </div>
                    </TD>
                    <TD className="font-medium">{currentActorUserId !== null && teacher.id === currentActorUserId ? "You" : teacher.username}</TD>
                    <TD className="text-muted-foreground">{teacher.email}</TD>
                    <TD><Badge tone={teacher.is_active ? "success" : "danger"}>{teacher.is_active ? "Active" : "Disabled"}</Badge></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No teachers found.</p>
          )}
        </CardContent>
      </Card>

      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={activeTeacher ? `Teacher #${activeTeacher.id}` : "Teacher details"}
        description={activeTeacher ? `${currentActorUserId !== null && activeTeacher.id === currentActorUserId ? "You" : activeTeacher.username} • ${activeTeacher.email}` : ""}
      >
        {activeTeacher ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 py-2">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-muted shadow-sm">
                {activeTeacher.profile_picture_url ? (
                  <img src={activeTeacher.profile_picture_url} alt={activeTeacher.username} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold uppercase text-muted-foreground">
                    {activeTeacher.username.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold">{activeTeacher.username}</h3>
                <p className="text-sm text-muted-foreground">{activeTeacher.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-md border border-border/70 bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">User ID</p>
                <p className="font-mono">{activeTeacher.id}</p>
              </div>
              <div className="rounded-md border border-border/70 bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${activeTeacher.is_active ? "bg-success" : "bg-danger"}`} />
                  <p className="font-medium">{activeTeacher.is_active ? "Active" : "Disabled"}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResetModalOpen(true)}>
                <KeyRound className="mr-2 h-4 w-4" />
                Reset password
              </Button>
              <Button onClick={() => onInitiateToggleStatus(activeTeacher)}>
                {activeTeacher.is_active ? <ShieldOff className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                {activeTeacher.is_active ? "Disable" : "Enable"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={resetModalOpen}
        onClose={() => {
          if (!resetting) {
            setResetModalOpen(false);
            setNewPassword("");
          }
        }}
        title="Reset Teacher Password"
        description={activeTeacher ? `Account: ${activeTeacher.username}` : ""}
        className="max-w-md"
      >
        <div className="space-y-6">
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 text-xs text-warning">
            <p className="font-semibold">Important Security Notice:</p>
            <p className="mt-1 opacity-90">Resetting a password is a critical action. The teacher will be forced to use this new password immediately.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium tracking-tight">Enter Temporary Password</label>
            <Input
              type="password"
              placeholder="Minimum 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-11 font-mono tracking-wider"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setResetModalOpen(false);
                setNewPassword("");
              }}
              disabled={resetting}
              className="font-medium"
            >
              Back to Details
            </Button>
            <Button
              onClick={() => setConfirmResetOpen(true)}
              disabled={resetting || newPassword.length < 8}
              className="px-6 font-semibold"
            >
              Update Password
            </Button>
          </div>
        </div>
      </Modal>

      <AlertDialog
        open={confirmStatusOpen}
        onClose={() => setConfirmStatusOpen(false)}
        onConfirm={onToggleTeacherStatus}
        title={pendingActiveState ? "Enable Teacher Account?" : "Disable Teacher Account?"}
        description={activeTeacher ? `Are you sure you want to ${pendingActiveState ? "enable" : "disable"} ${activeTeacher.username}? This will ${pendingActiveState ? "allow" : "prevent"} them from logging in and accessing their subjects.` : ""}
        confirmText={pendingActiveState ? "Enable Account" : "Disable Account"}
        variant={pendingActiveState ? "default" : "danger"}
        loading={resetting}
      />

      <AlertDialog
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={onResetTeacherPassword}
        title="Confirm Password Reset?"
        description="This will override the user's current password immediately. This action cannot be undone."
        confirmText="Confirm Reset"
        variant="danger"
        loading={resetting}
      />
    </div>
  );
}
