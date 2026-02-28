import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "success" | "warning" | "danger" }) {
  const tones: Record<string, string> = {
    default: "border border-border bg-secondary text-secondary-foreground",
    success: "border border-success/30 bg-success/15 text-success",
    warning: "border border-warning/35 bg-warning/15 text-warning",
    danger: "border border-danger/35 bg-danger/15 text-danger",
  };
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}
