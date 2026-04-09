import { cn } from "@/lib/utils";

const variants = {
  default: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200",
  success: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  warning: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  danger: "bg-red-100 text-red-700 ring-1 ring-red-200",
  info: "bg-lm-sky text-lm-dark-teal ring-1 ring-lm-aqua/20",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: keyof typeof variants;
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", variants[variant])}>
      {children}
    </span>
  );
}
