import { cn } from "@/lib/utils";

const variants = {
  default: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200",
  success: "bg-lm-sky text-lm-dark-teal ring-1 ring-lm-aqua/30",
  warning: "bg-lm-sky text-lm-dark-teal ring-1 ring-lm-aqua/40",
  danger: "bg-lm-orange-light text-lm-orange ring-1 ring-lm-orange/30",
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
