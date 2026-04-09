import { cn } from "@/lib/utils";

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-2xl border border-lm-aqua/15 bg-white shadow-sm ring-1 ring-zinc-100/60",
        className
      )}
    >
      {children}
    </div>
  );
}
