"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  widthClassName?: string;
};

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  widthClassName = "max-w-xl",
}: DrawerProps) {
  const [shouldRender, setShouldRender] = useState(open);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      return;
    }
    const timer = window.setTimeout(() => setShouldRender(false), 220);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!shouldRender) return;
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
  }, [shouldRender, onClose]);

  if (!shouldRender || typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        className={cn(
          "absolute inset-0 bg-black/45 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-label="Close drawer overlay"
      />
      <section
        className={cn(
          "absolute right-0 top-0 h-full w-full overflow-y-auto border-l border-border/70 bg-background/95 p-6 backdrop-blur-xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full",
          widthClassName
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">{title}</h3>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <Button variant="outline" size="icon" onClick={onClose} aria-label={`Close ${title}`}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </section>
    </div>,
    document.body
  );
}
