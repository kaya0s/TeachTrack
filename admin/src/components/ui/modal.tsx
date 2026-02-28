"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function Modal({ open, onClose, title, description, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/55" onClick={onClose} aria-label="Close modal overlay" />
      <section
        className={cn("relative w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl", className)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        <div className="mt-5">{children}</div>
      </section>
    </div>,
    document.body
  );
}
