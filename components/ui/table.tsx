import { cn } from "@/lib/utils";

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-3xl border border-lm-dark-teal/10 bg-white shadow-[0_10px_40px_rgba(24,110,116,0.05)]",
        className
      )}
    >
      {children}
    </div>
  );
}
