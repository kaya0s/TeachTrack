"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type AlertDialogProps = {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "danger";
    loading?: boolean;
};

export function AlertDialog({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Continue",
    cancelText = "Cancel",
    variant = "default",
    loading = false,
}: AlertDialogProps) {
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !loading) onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, onClose, loading]);

    if (!open || typeof window === "undefined") return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => !loading && onClose()}
            />
            <div
                className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in duration-200"
                role="alertdialog"
            >
                <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
                <div className="mt-6 flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={variant === "danger" ? "danger" : "default"}
                        onClick={onConfirm}
                        loading={loading}
                        disabled={loading}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}
