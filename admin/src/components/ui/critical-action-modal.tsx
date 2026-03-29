"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CriticalActionModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void> | void;
  className?: string;
};

export function CriticalActionModal({
  open,
  title,
  description,
  confirmText = "Confirm Action",
  cancelText = "Cancel",
  loading = false,
  onClose,
  onConfirm,
  className,
}: CriticalActionModalProps) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) {
      setPassword("");
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, loading, onClose]);

  if (!open || typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
        aria-label="Close critical action modal overlay"
      />
      <section
        className={cn(
          "relative w-full max-w-md rounded-2xl border border-danger/30 bg-card p-5 shadow-2xl",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-3 flex items-start gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-danger">Admin password</label>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoFocus
            disabled={loading}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => onConfirm(password)}
            disabled={loading || !password.trim()}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
