import { cn } from "@/lib/utils";

import { Card } from "@/components/ui/card";

interface KpiCardProps {
  label: string;
  value: string;
  helper?: string;
  /** Resalta esta tarjeta como metrica principal (borde acento LM). */
  emphasized?: boolean;
}

export function KpiCard({ label, value, helper, emphasized }: KpiCardProps) {
  return (
    <Card
      className={cn(
        "min-h-[112px] transition-shadow hover:shadow-md",
        emphasized && "border-l-4 border-l-lm-aqua shadow-sm ring-1 ring-lm-aqua/15"
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-lm-dark-teal sm:text-[1.75rem]">
        {value}
      </p>
      {helper ? <p className="mt-2 text-xs leading-snug text-zinc-500">{helper}</p> : null}
    </Card>
  );
}
