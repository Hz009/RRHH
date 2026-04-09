import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DashboardSectionTitle({
  children,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h2" | "h3";
}) {
  return (
    <Tag className={cn("flex items-center gap-2.5 text-lg font-semibold tracking-tight text-lm-dark-teal", className)}>
      <span className="h-5 w-1 shrink-0 rounded-full bg-lm-aqua" aria-hidden />
      {children}
    </Tag>
  );
}
