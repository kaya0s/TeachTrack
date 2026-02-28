"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, CircleAlert, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastTone = "default" | "success" | "warning" | "danger";

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastContextValue = {
  notify: (payload: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, string> = {
  default: "border-border bg-card",
  success: "border-success/35 bg-success/10",
  warning: "border-warning/35 bg-warning/10",
  danger: "border-danger/35 bg-danger/10",
};

const toneIcons: Record<ToastTone, React.ReactNode> = {
  default: <CheckCircle2 className="h-4 w-4 text-primary" />,
  success: <CheckCircle2 className="h-4 w-4 text-success" />,
  warning: <AlertTriangle className="h-4 w-4 text-warning" />,
  danger: <CircleAlert className="h-4 w-4 text-danger" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (payload: Omit<ToastItem, "id">) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const duration = payload.durationMs ?? 3200;
      setItems((prev) => [...prev, { ...payload, id }]);
      window.setTimeout(() => remove(id), duration);
    },
    [remove]
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-full max-w-sm flex-col gap-2">
        {items.map((item) => {
          const tone = item.tone ?? "default";
          return (
            <article
              key={item.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-lg border px-3 py-2 shadow-lg backdrop-blur-sm",
                toneStyles[tone]
              )}
            >
              <span className="mt-0.5">{toneIcons[tone]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                {item.description ? <p className="text-xs text-muted-foreground">{item.description}</p> : null}
              </div>
              <button
                type="button"
                className="text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => remove(item.id)}
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </article>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
