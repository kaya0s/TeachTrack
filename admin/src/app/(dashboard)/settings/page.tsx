"use client";

import { ChevronDown, Image as ImageIcon, Loader2, Play, RotateCcw, Settings, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { getSettings, testDetection, updateSettings } from "@/features/admin/api";
import type { AdminDetectionBox, AdminSettings, AdminSettingsUpdate } from "@/features/admin/types";

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
  if (detection.detection_confidence_threshold < 0 || detection.detection_confidence_threshold > 1) {
    errors["detection.detection_confidence_threshold"] = "Threshold must be between 0 and 1.";
  }

  const weights = settings.engagement_weights;
  if (weights.on_task < 0 || weights.on_task > 5) {
    errors["engagement_weights.on_task"] = "Must be between 0 and 5.";
  }
  if (weights.using_phone < 0 || weights.using_phone > 5) {
    errors["engagement_weights.using_phone"] = "Must be between 0 and 5.";
  }
  if (weights.sleeping < 0 || weights.sleeping > 5) {
    errors["engagement_weights.sleeping"] = "Must be between 0 and 5.";
  }
  if (weights.off_task < 0 || weights.off_task > 5) {
    errors["engagement_weights.off_task"] = "Must be between 0 and 5.";
  }
  if (weights.not_visible < 0 || weights.not_visible > 5) {
    errors["engagement_weights.not_visible"] = "Must be between 0 and 5.";
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

function DetectionThresholdPreview({
  threshold,
  onThresholdChange,
  onReset,
}: {
  threshold: number;
  onThresholdChange: (val: number) => void;
  onReset: () => void;
}) {
  const { notify } = useToast();
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detections, setDetections] = useState<AdminDetectionBox[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeLegendFilter, setActiveLegendFilter] = useState<string>("all");
  const imageRef = useRef<HTMLImageElement>(null);
  const DETECTION_COLORS: Record<string, string> = {
    on_task: "#22c55e",
    using_phone: "#ef4444",
    off_task: "#f97316",
    sleeping: "#a855f7",
  };

  const getDetectionKey = (det: AdminDetectionBox): string => (det.label || "").trim();

  const formatBehaviorLabel = (value: string): string => value.replace(/_/g, " ");

  const getDetectionColor = (det: AdminDetectionBox): string =>
    DETECTION_COLORS[getDetectionKey(det)] || "#3b82f6";
  const legendItems = [
    { key: "all", label: "All" },
    { key: "on_task", label: "On Task" },
    { key: "using_phone", label: "Using Phone" },
    { key: "off_task", label: "Off Task" },
    { key: "sleeping", label: "Sleeping" },
  ];

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      setDetections([]);
    }
  };

  const runDetection = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const res = await testDetection(image);
      setDetections(res.detections);
      notify({ tone: "success", title: "Detection complete" });
    } catch (err) {
      notify({
        tone: "danger",
        title: "Detection failed",
        description: err instanceof Error ? err.message : "Could not run detection.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2">
          <label className="text-sm font-semibold text-foreground/90">
            Current Threshold: <span className="text-primary">{(threshold * 100).toFixed(0)}%</span>
          </label>
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2 hover:bg-primary/10" onClick={onReset}>
            <RotateCcw className="mr-1 h-3 w-3" /> Reset to 50%
          </Button>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={threshold}
          onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
          className="mx-auto h-2 w-full max-w-md cursor-pointer appearance-none rounded-lg bg-border accent-primary"
        />
        <div className="mx-auto flex w-full max-w-md justify-between text-[10px] text-muted-foreground uppercase font-medium tracking-tight">
          <span>More Detections</span>
          <span>Optimal Range (0.5-0.7)</span>
          <span>Stricter Results</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          <span className="font-semibold text-foreground/80">Box Legend (Click to Filter):</span>
          {legendItems.map((item) => {
            const isActive = activeLegendFilter === item.key;
            const dotColor = item.key === "all" ? "#3b82f6" : (DETECTION_COLORS[item.key] || "#3b82f6");
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveLegendFilter(item.key)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 transition",
                  isActive
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border/60 bg-card/70 text-muted-foreground hover:border-primary/35 hover:text-foreground"
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative isolate overflow-hidden rounded-xl border border-border/60 bg-slate-950/20 shadow-inner">
        {!previewUrl ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center bg-slate-900/10">
            <div className="rounded-full bg-primary/10 p-4 ring-8 ring-primary/5">
              <ImageIcon className="h-8 w-8 text-primary" />
            </div>
            <h4 className="mt-6 font-medium">Detection Preview Area</h4>
            <p className="mt-2 max-w-[240px] text-xs text-muted-foreground leading-relaxed">
              Upload a classroom scenario image to calibrate the AI sensitivity in real-time.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-6 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all font-semibold"
              onClick={() => document.getElementById("test-image-input")?.click()}
            >
              <Upload className="mr-2 h-4 w-4" /> Select Test Image
            </Button>
          </div>
        ) : (
          <div className="relative">
            <img ref={imageRef} src={previewUrl} alt="Preview" className="block w-full" />

            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {detections.map((det, i) => {
                const detKey = getDetectionKey(det);
                if (activeLegendFilter !== "all" && detKey !== activeLegendFilter) return null;
                const isAbove = det.confidence >= threshold;
                if (!imageRef.current) return null;
                const detectionColor = getDetectionColor(det);
                const labelText = formatBehaviorLabel(detKey);

                const naturalW = imageRef.current.naturalWidth || 1;
                const naturalH = imageRef.current.naturalHeight || 1;

                const [x1, y1, x2, y2] = det.box;
                const left = (x1 / naturalW) * 100;
                const top = (y1 / naturalH) * 100;
                const width = ((x2 - x1) / naturalW) * 100;
                const height = ((y2 - y1) / naturalH) * 100;

                return (
                  <div
                    key={i}
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                      borderWidth: "2px",
                      opacity: isAbove ? 1 : 0.2,
                      scale: isAbove ? "1" : "0.98",
                      borderColor: isAbove ? detectionColor : "rgba(148,163,184,0.45)",
                      boxShadow: isAbove ? `0 0 12px ${detectionColor}99` : "none",
                    }}
                    className={cn(
                      "absolute border-solid transition-all duration-300 ease-out",
                      isAbove ? "z-10" : "dashed grayscale"
                    )}
                  >
                    {isAbove && (
                      <div
                        style={{ backgroundColor: detectionColor }}
                        className="absolute -top-[21px] left-0 whitespace-nowrap rounded-t-sm px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm ring-1 ring-white/10 uppercase"
                      >
                        {labelText} {(det.confidence * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-3 text-white">
                  <div className="p-3 rounded-full bg-primary/20 border border-primary/30 shadow-2xl">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" />
                  </div>
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/90">Processing Neural Nets</span>
                </div>
              </div>
            )}

            <div className="border-t border-border/60 bg-card/80 px-4 py-3">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  className="border-white/20 bg-slate-900/70 text-white hover:bg-slate-900 hover:text-white"
                  onClick={() => document.getElementById("test-image-input")?.click()}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Change Image
                </Button>
                <Button
                  size="sm"
                  disabled={loading}
                  onClick={runDetection}
                  className="h-9 rounded-full border px-3 text-sm font-medium flex items-center gap-1.5"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {loading ? "Analyzing" : "Run Test Detection"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <input
          id="test-image-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onImageChange}
        />
      </div>
    </div>
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
              title="Detection Intelligence"
              description="AI calibration, timing, and camera controls."
              defaultOpen
            >
              <div className="space-y-8">
                <div className="rounded-2xl border border-border/40 bg-slate-500/5 p-6 shadow-sm">
                  <div className="mb-6">
                    <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px]">1</span>
                      Confidence Threshold Calibration
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Detections below this threshold are discarded. Higher values reduce false positives but may miss subtle behaviors.
                    </p>
                  </div>

                  <DetectionThresholdPreview
                    threshold={settings.detection.detection_confidence_threshold}
                    onThresholdChange={(val: number) => updateDetection("detection_confidence_threshold", val)}
                    onReset={() => updateDetection("detection_confidence_threshold", 0.5)}
                  />
                </div>

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
                  <label className="text-sm font-medium">Using phone weight</label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step="0.1"
                    value={settings.engagement_weights.using_phone}
                    onChange={(e) => updateWeights("using_phone", Number(e.target.value || 0))}
                  />
                  {errors["engagement_weights.using_phone"] ? (
                    <p className="text-xs text-danger">{errors["engagement_weights.using_phone"]}</p>
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
                  <label className="text-sm font-medium">Off-task weight</label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step="0.1"
                    value={settings.engagement_weights.off_task}
                    onChange={(e) => updateWeights("off_task", Number(e.target.value || 0))}
                  />
                  {errors["engagement_weights.off_task"] ? (
                    <p className="text-xs text-danger">{errors["engagement_weights.off_task"]}</p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Not visible weight (penalty)</label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step="0.1"
                    value={settings.engagement_weights.not_visible}
                    onChange={(e) => updateWeights("not_visible", Number(e.target.value || 0))}
                  />
                  {errors["engagement_weights.not_visible"] ? (
                    <p className="text-xs text-danger">{errors["engagement_weights.not_visible"]}</p>
                  ) : null}
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                    Penalty for students present in class but not detected by YOLO. Set to 0 to ignore them.
                  </p>
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
        title={confirmMode === "save" ? "Review & Confirm Changes" : "Confirm Reset to Defaults"}
        description={
          confirmMode === "save"
            ? "Please review the modifications below before confirming with your administrator password."
            : "Enter your password to reset all system configuration to environment defaults."
        }
      >
        <div className="space-y-6">
          {confirmMode === "save" && dirty && (
             <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-warning mb-3">Pending Modifications</p>
                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {(() => {
                        const current = settings;
                        const initial = initialSettings;
                        if (!current || !initial) return null;
                        
                        const changes: React.ReactNode[] = [];
                        
                        // Check Detection
                        Object.keys(current.detection).forEach((k) => {
                            const key = k as keyof AdminSettings["detection"];
                            if (current.detection[key] !== initial.detection[key]) {
                                changes.push(
                                    <div key={`det-${key}`} className="flex items-center justify-between text-xs border-b border-warning/10 pb-1 last:border-0 last:pb-0">
                                        <span className="text-muted-foreground font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                                        <span className="flex items-center gap-2">
                                            <span className="text-muted-foreground/60 line-through">{String(initial.detection[key])}</span>
                                            <span className="text-warning font-bold">{String(current.detection[key])}</span>
                                        </span>
                                    </div>
                                );
                            }
                        });

                        // Check Weights
                        Object.keys(current.engagement_weights).forEach((k) => {
                            const key = k as keyof AdminSettings["engagement_weights"];
                            if (current.engagement_weights[key] !== initial.engagement_weights[key]) {
                                changes.push(
                                    <div key={`weight-${key}`} className="flex items-center justify-between text-xs border-b border-warning/10 pb-1 last:border-0 last:pb-0">
                                        <span className="text-muted-foreground font-medium capitalize">{key.replace(/_/g, ' ')} Weight</span>
                                        <span className="flex items-center gap-2">
                                            <span className="text-muted-foreground/60 line-through">{initial.engagement_weights[key]}</span>
                                            <span className="text-warning font-bold">{current.engagement_weights[key]}</span>
                                        </span>
                                    </div>
                                );
                            }
                        });

                        // Check Ops
                        Object.keys(current.admin_ops).forEach((k) => {
                            const key = k as keyof AdminSettings["admin_ops"];
                            if (current.admin_ops[key] !== initial.admin_ops[key]) {
                                changes.push(
                                    <div key={`ops-${key}`} className="flex items-center justify-between text-xs border-b border-warning/10 pb-1 last:border-0 last:pb-0">
                                        <span className="text-muted-foreground font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                                        <span className="text-warning font-bold">{current.admin_ops[key] ? "Enabled" : "Disabled"}</span>
                                    </div>
                                );
                            }
                        });

                        // Check Security
                        Object.keys(current.security).forEach((k) => {
                            const key = k as keyof AdminSettings["security"];
                            if (current.security[key] !== initial.security[key]) {
                                changes.push(
                                    <div key={`sec-${key}`} className="flex items-center justify-between text-xs border-b border-warning/10 pb-1 last:border-0 last:pb-0">
                                        <span className="text-muted-foreground font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                                        <span className="flex items-center gap-2">
                                            <span className="text-muted-foreground/60 line-through">{initial.security[key]}m</span>
                                            <span className="text-warning font-bold">{current.security[key]}m</span>
                                        </span>
                                    </div>
                                );
                            }
                        });

                        return changes;
                    })()}
                </div>
             </div>
          )}

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
        </div>
      </Modal>
    </>
  );
}

