import { cn } from "@/lib/utils";

interface CardProps {
  title?: string;
  description?: string;
  className?: string;
  /** Clases del contenedor interno (debajo del titulo). */
  bodyClassName?: string;
  children: React.ReactNode;
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
