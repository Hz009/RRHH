import { cn } from "@/lib/utils";

interface CardProps {
  title?: string;
  description?: string;
  className?: string;
  /** Clases del contenedor interno (debajo del titulo). */
  bodyClassName?: string;
  children: React.ReactNode;
}

const noticeTone = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
} as const;

export function Notice({
  tone,
  children,
  className,
}: {
  tone: keyof typeof noticeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return <Card className={cn("p-4 text-sm", noticeTone[tone], className)}>{children}</Card>;
}

export function Card({ title, description, className, bodyClassName, children }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-lm-aqua/15 bg-white p-5 shadow-sm ring-1 ring-zinc-100/60 transition-shadow hover:shadow-md",
        className
      )}
    >
      {title ? <h3 className="text-base font-semibold tracking-tight text-lm-dark-teal">{title}</h3> : null}
      {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
      <div className={cn(title || description ? "mt-4" : "", bodyClassName)}>{children}</div>
    </section>
  );
}
