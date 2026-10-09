"use client";

import { useMemo, useState } from "react";

import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { DISCOUNT_TYPES, INCENTIVE_TYPES } from "@/lib/payslip";

export function PayAdjustmentForm({ employeeId }: { employeeId: string }) {
  const [kind, setKind] = useState<"incentive" | "discount">("incentive");
  const types = kind === "incentive" ? INCENTIVE_TYPES : DISCOUNT_TYPES;
  const defaultType = types[0]?.value ?? "";
  const typeOptions = useMemo(() => types, [types]);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="employee_id" value={employeeId} />
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Qué es</label>
        <select
          name="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value === "discount" ? "discount" : "incentive")}
          className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
        >
          <option value="incentive">Incentivo</option>
          <option value="discount">Descuento</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Tipo</label>
        <select name="adjustment_type" key={kind} defaultValue={defaultType} className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm" required>
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="mb-1 block text-sm text-zinc-700">Comentario</label>
        <Input name="comment" required placeholder="Por qué se aplica" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Monto</label>
        <Input name="amount" type="number" min="0.01" step="0.01" required />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Cuándo</label>
        <select name="recurrence" defaultValue="once" className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm">
          <option value="once">Puntual, solo ese mes</option>
          <option value="monthly">Mensual, desde ese mes</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Mes</label>
        <Input name="period_month" type="month" required />
      </div>
      <div className="flex items-end">
        <ConfirmSubmitButton type="submit" confirmMessage="Confirma que deseas guardar este incentivo o descuento.">
          Guardar
        </ConfirmSubmitButton>
      </div>
    </div>
  );
}
