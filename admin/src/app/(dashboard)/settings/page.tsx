"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Settings } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { getSettings, updateSettings } from "@/features/admin/api";
import type { AdminSettings, AdminSettingsUpdate } from "@/features/admin/types";

type ValidationResult = {
  errors: Record<string, string>;
  isValid: boolean;
};

const editablePayload = (settings: AdminSettings | null): AdminSettingsUpdate | null => {
  if (!settings) return null;
  return {
    detection: { ...settings.detection },
    engagement_weights: { ...settings.engagement_weights },
    admin_ops: { ...settings.admin_ops },
    security: { ...settings.security },
  };
};

const validateSettings = (settings: AdminSettings | null): ValidationResult => {
  if (!settings) return { errors: {}, isValid: true };
  const errors: Record<string, string> = {};

  const detection = settings.detection;
  if (detection.detect_interval_seconds < 1 || detection.detect_interval_seconds > 60) {
    errors["detection.detect_interval_seconds"] = "Must be between 1 and 60 seconds.";
  }
  if (detection.detector_heartbeat_timeout_seconds < 5 || detection.detector_heartbeat_timeout_seconds > 300) {
    errors["detection.detector_heartbeat_timeout_seconds"] = "Must be between 5 and 300 seconds.";
  }
  if (detection.server_camera_index < 0 || detection.server_camera_index > 10) {
    errors["detection.server_camera_index"] = "Must be between 0 and 10.";
  }
  if (detection.alert_cooldown_minutes < 1 || detection.alert_cooldown_minutes > 120) {
    errors["detection.alert_cooldown_minutes"] = "Must be between 1 and 120 minutes.";
  }

  const weights = settings.engagement_weights;
  if (weights.on_task < 0 || weights.on_task > 5) {
    errors["engagement_weights.on_task"] = "Must be between 0 and 5.";
  }
  if (weights.phone < 0 || weights.phone > 5) {
    errors["engagement_weights.phone"] = "Must be between 0 and 5.";
  }
  if (weights.sleeping < 0 || weights.sleeping > 5) {
    errors["engagement_weights.sleeping"] = "Must be between 0 and 5.";
  }
  if (weights.disengaged_posture < 0 || weights.disengaged_posture > 5) {
    errors["engagement_weights.disengaged_posture"] = "Must be between 0 and 5.";
  }

  if (settings.security.access_token_expire_minutes < 5 || settings.security.access_token_expire_minutes > 43200) {
    errors["security.access_token_expire_minutes"] = "Must be between 5 and 43200 minutes.";
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
};

function SettingsSection({
  title,
  description,
  tone = "default",
  children,
  defaultOpen = false,
}: {
  title: string;
  description?: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className={cn(
        "group rounded-2xl border border-border/60 bg-card/80 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur",
        tone === "danger" && "border-danger/30 bg-danger/5"
      )}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-start gap-2">
          <span
            className={cn(
              "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
              tone === "danger" ? "bg-danger shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "bg-primary/60"
            )}
          />
          <div>
            <p className={cn("text-sm font-semibold", tone === "danger" ? "text-danger" : "text-foreground")}>
            {title}
            </p>
            {description ? (
              <p className={cn("text-xs", tone === "danger" ? "text-danger/80" : "text-muted-foreground")}>
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border/60 px-4 py-4">{children}</div>
    </details>
  );
}

export default function SettingsPage() {
  const { notify } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [initialSettings, setInitialSettings] = useState<AdminSettings | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"save" | "reset">("save");

  const { errors, isValid } = useMemo(() => validateSettings(settings), [settings]);

  const dirty = useMemo(() => {
    const current = editablePayload(settings);
    const initial = editablePayload(initialSettings);
    return JSON.stringify(current) !== JSON.stringify(initial);
  }, [settings, initialSettings]);

  const passwordError = useMemo(() => {
    if (!password) return "Password is required.";
    if (!confirmPassword) return "Please confirm your password.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  }, [password, confirmPassword]);

  const canSave = dirty && isValid && !saving;

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getSettings();
      setSettings(data);
      setInitialSettings(data);
    } catch (err) {
      notify({
        tone: "danger",
        title: "Settings load failed",
        description: err instanceof Error ? err.message : "Could not load settings.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const clearPasswordFields = () => {
    setPassword("");
    setConfirmPassword("");
  };

  const onOpenConfirm = (mode: "save" | "reset") => {
    clearPasswordFields();
    setConfirmMode(mode);
    setConfirmOpen(true);
  };

  const onSave = async () => {
    if (!settings) return;
    if (passwordError) {
      notify({ tone: "danger", title: "Password confirmation required", description: passwordError });
      return;
    }
    const payload = editablePayload(settings);
    if (!payload) return;
    setSaving(true);
    try {
      const updated = await updateSettings({ ...payload, confirm_password: password });
      setSettings(updated);
      setInitialSettings(updated);
      clearPasswordFields();
      setConfirmOpen(false);
      notify({ tone: "success", title: "Settings saved" });
    } catch (err) {
      notify({
        tone: "danger",
        title: "Save failed",
        description: err instanceof Error ? err.message : "Could not update settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    if (passwordError) {
      notify({ tone: "danger", title: "Password confirmation required", description: passwordError });
      return;
    }
    setSaving(true);
    try {
      const updated = await updateSettings({ reset: true, confirm_password: password });
      setSettings(updated);
      setInitialSettings(updated);
      clearPasswordFields();
      setConfirmOpen(false);
      notify({ tone: "success", title: "Settings reset to defaults" });
    } catch (err) {
      notify({
        tone: "danger",
        title: "Reset failed",
        description: err instanceof Error ? err.message : "Could not reset settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  const onSaveButtonClick = () => {
    if (!dirty || !isValid) return;
    onOpenConfirm("save");
  };

  const onResetButtonClick = () => {
    if (!dirty) return;
    onOpenConfirm("reset");
  };

  const onCancelConfirm = () => {
    if (saving) return;
    setConfirmOpen(false);
  };

  const onConfirmSubmit = async () => {
    if (confirmMode === "save") {
      await onSave();
      return;
    }
    await onReset();
  };

  const statusBadges = useMemo(() => {
    if (!settings) return [];
    return [
      {
        label: settings.detection.server_camera_enabled ? "Camera On" : "Camera Off",
        tone: settings.detection.server_camera_enabled ? "success" : "warning",
      },
      {
        label: settings.admin_ops.enable_admin_log_stream ? "Log Stream On" : "Log Stream Off",
        tone: settings.admin_ops.enable_admin_log_stream ? "success" : "warning",
      },
      {
        label: settings.integrations.cloudinary_configured ? "Cloudinary OK" : "Cloudinary Missing",
        tone: settings.integrations.cloudinary_configured ? "success" : "warning",
      },
      {
        label: settings.integrations.mail_configured ? "Email OK" : "Email Missing",
        tone: settings.integrations.mail_configured ? "success" : "warning",
      },
    ] as const;
  }, [settings]);

  const updateDetection = (key: keyof AdminSettings["detection"], value: number | boolean) => {
    setSettings((prev) => (prev ? { ...prev, detection: { ...prev.detection, [key]: value } } : prev));
  };

  const updateWeights = (key: keyof AdminSettings["engagement_weights"], value: number) => {
    setSettings((prev) => (prev ? { ...prev, engagement_weights: { ...prev.engagement_weights, [key]: value } } : prev));
  };

  const updateAdminOps = (key: keyof AdminSettings["admin_ops"], value: boolean) => {
    setSettings((prev) => (prev ? { ...prev, admin_ops: { ...prev.admin_ops, [key]: value } } : prev));
  };

  const updateSecurity = (key: keyof AdminSettings["security"], value: number) => {
    setSettings((prev) => (prev ? { ...prev, security: { ...prev.security, [key]: value } } : prev));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={<><Settings className="h-5 w-5" />Settings</>} description="System preferences and controls." />
        <Card>
          <CardContent className="space-y-3 pt-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-4">
        <PageHeader title={<><Settings className="h-5 w-5" />Settings</>} description="System preferences and controls." />
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">No settings available.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title={<><Settings className="h-5 w-5" />Settings</>}
          description="Live configuration center for detection, scoring, and security."
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {dirty ? <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-1 text-warning">Unsaved changes</span> : null}
            {!isValid ? <span className="rounded-full border border-danger/40 bg-danger/10 px-2 py-1 text-danger">Fix validation errors</span> : null}
          </div>
          <Button onClick={onSaveButtonClick} disabled={!canSave}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-slate-950/80 via-slate-900/80 to-slate-950/80 p-4 text-white shadow-[0_16px_40px_-30px_rgba(15,23,42,0.6)]">
              <p className="text-xs uppercase tracking-[0.25em] text-white/60">Control Hub</p>
              <h3 className="mt-2 text-lg font-semibold">System Pulse</h3>
              <p className="mt-1 text-xs text-white/70">
                Changes apply instantly across detection, alerts, and scoring.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {statusBadges.map((badge) => (
                  <Badge key={badge.label} tone={badge.tone}>
                    {badge.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Quick Stats</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Detect interval</span>
                  <span className="font-semibold">{settings.detection.detect_interval_seconds}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Alert cooldown</span>
                  <span className="font-semibold">{settings.detection.alert_cooldown_minutes}m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Token TTL</span>
                  <span className="font-semibold">{settings.security.access_token_expire_minutes}m</span>
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-3">
        <SettingsSection
          title="Detection & Alerts"
          description="Timing, camera, and alert throttling controls."
          defaultOpen
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Detect interval (seconds)</label>
              <Input
                type="number"
                min={1}
                max={60}
                value={settings.detection.detect_interval_seconds}
                onChange={(e) => updateDetection("detect_interval_seconds", Number(e.target.value || 0))}
              />
              {errors["detection.detect_interval_seconds"] ? (
                <p className="text-xs text-danger">{errors["detection.detect_interval_seconds"]}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Heartbeat timeout (seconds)</label>
              <Input
                type="number"
                min={5}
                max={300}
                value={settings.detection.detector_heartbeat_timeout_seconds}
                onChange={(e) => updateDetection("detector_heartbeat_timeout_seconds", Number(e.target.value || 0))}
              />
              {errors["detection.detector_heartbeat_timeout_seconds"] ? (
                <p className="text-xs text-danger">{errors["detection.detector_heartbeat_timeout_seconds"]}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Alert cooldown (minutes)</label>
              <Input
                type="number"
                min={1}
                max={120}
                value={settings.detection.alert_cooldown_minutes}
                onChange={(e) => updateDetection("alert_cooldown_minutes", Number(e.target.value || 0))}
              />
              {errors["detection.alert_cooldown_minutes"] ? (
                <p className="text-xs text-danger">{errors["detection.alert_cooldown_minutes"]}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Camera index</label>
              <Input
                type="number"
                min={0}
                max={10}
                value={settings.detection.server_camera_index}
                onChange={(e) => updateDetection("server_camera_index", Number(e.target.value || 0))}
              />
              {errors["detection.server_camera_index"] ? (
                <p className="text-xs text-danger">{errors["detection.server_camera_index"]}</p>
              ) : null}
            </div>

            <label className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">Enable server camera</p>
                <p className="text-xs text-muted-foreground">Allow server-side webcam detections.</p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                checked={settings.detection.server_camera_enabled}
                onChange={(e) => updateDetection("server_camera_enabled", e.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">Enable camera preview</p>
                <p className="text-xs text-muted-foreground">Show annotated frames on the server.</p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                checked={settings.detection.server_camera_preview}
                onChange={(e) => updateDetection("server_camera_preview", e.target.checked)}
              />
            </label>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Engagement Weights"
          description="Tune how each behavior impacts engagement scoring."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">On-task weight</label>
              <Input
                type="number"
                min={0}
                max={5}
                step="0.1"
                value={settings.engagement_weights.on_task}
                onChange={(e) => updateWeights("on_task", Number(e.target.value || 0))}
              />
              {errors["engagement_weights.on_task"] ? (
                <p className="text-xs text-danger">{errors["engagement_weights.on_task"]}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Phone usage weight</label>
              <Input
                type="number"
                min={0}
                max={5}
                step="0.1"
                value={settings.engagement_weights.phone}
                onChange={(e) => updateWeights("phone", Number(e.target.value || 0))}
              />
              {errors["engagement_weights.phone"] ? (
                <p className="text-xs text-danger">{errors["engagement_weights.phone"]}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Sleeping weight</label>
              <Input
                type="number"
                min={0}
                max={5}
                step="0.1"
                value={settings.engagement_weights.sleeping}
                onChange={(e) => updateWeights("sleeping", Number(e.target.value || 0))}
              />
              {errors["engagement_weights.sleeping"] ? (
                <p className="text-xs text-danger">{errors["engagement_weights.sleeping"]}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Disengaged posture weight</label>
              <Input
                type="number"
                min={0}
                max={5}
                step="0.1"
                value={settings.engagement_weights.disengaged_posture}
                onChange={(e) => updateWeights("disengaged_posture", Number(e.target.value || 0))}
              />
              {errors["engagement_weights.disengaged_posture"] ? (
                <p className="text-xs text-danger">{errors["engagement_weights.disengaged_posture"]}</p>
              ) : null}
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Admin Ops" description="Operational toggles for admin tooling.">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">Enable admin log stream</p>
                <p className="text-xs text-muted-foreground">Toggle real-time server log buffering.</p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                checked={settings.admin_ops.enable_admin_log_stream}
                onChange={(e) => updateAdminOps("enable_admin_log_stream", e.target.checked)}
              />
            </label>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Danger Zone"
          description="Security-sensitive updates require confirmation."
          tone="danger"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-danger">Access token TTL (minutes)</label>
              <Input
                type="number"
                min={5}
                max={43200}
                value={settings.security.access_token_expire_minutes}
                onChange={(e) => updateSecurity("access_token_expire_minutes", Number(e.target.value || 0))}
              />
              {errors["security.access_token_expire_minutes"] ? (
                <p className="text-xs text-danger">{errors["security.access_token_expire_minutes"]}</p>
              ) : (
                <p className="text-xs text-danger/80">Applies to new logins only.</p>
              )}
            </div>

            <div className="space-y-2 rounded-lg border border-danger/30 bg-danger/5 p-3">
              <p className="text-sm font-semibold text-danger">Reset all overrides</p>
              <p className="text-xs text-danger/80">Reverts to environment defaults immediately.</p>
              <Button
                variant="outline"
                className="border-danger/40 text-danger"
                onClick={onResetButtonClick}
                disabled={saving || !dirty}
              >
                Reset to defaults
              </Button>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Integrations" description="Environment-managed integrations status.">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">Cloudinary</p>
                <p className="text-xs text-muted-foreground">Subject cover uploads and teacher avatars.</p>
              </div>
              <Badge tone={settings.integrations.cloudinary_configured ? "default" : "warning"}>
                {settings.integrations.cloudinary_configured ? "Configured" : "Missing"}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">Email (SMTP)</p>
                <p className="text-xs text-muted-foreground">Password reset and verification emails.</p>
              </div>
              <Badge tone={settings.integrations.mail_configured ? "default" : "warning"}>
                {settings.integrations.mail_configured ? "Configured" : "Missing"}
              </Badge>
            </div>
          </div>
        </SettingsSection>
          </div>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={onCancelConfirm}
        title={confirmMode === "save" ? "Confirm Settings Update" : "Confirm Reset to Defaults"}
        description={
          confirmMode === "save"
            ? "Enter your password to apply the updated settings."
            : "Enter your password to reset settings to environment defaults."
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-danger">Admin password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-danger">Confirm password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
            />
          </div>
          {passwordError ? <p className="text-xs text-danger">{passwordError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancelConfirm} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={onConfirmSubmit} disabled={!!passwordError || saving}>
              {saving ? "Confirming..." : "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
  