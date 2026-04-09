"use client";

import { useFormState } from "react-dom";

import { punchClockAction } from "@/app/(backoffice)/employee-portal/actions";
import { Button } from "@/components/ui/button";

interface TimeClockCardProps {
  shiftOpen: boolean;
}

export function TimeClockCard({ shiftOpen }: TimeClockCardProps) {
  const [state, formAction] = useFormState(punchClockAction, null);

  return (
    <div className="rounded-xl border border-lm-aqua/20 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-lm-dark-teal">Fichaje</h3>
      <p className="mt-1 text-xs text-zinc-600">
        Estado:{" "}
        <span className="font-medium text-zinc-800">{shiftOpen ? "Turno abierto (en curso)" : "Sin turno abierto"}</span>
      </p>
      {state?.error ? (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-800">
          Fichaje registrado.
        </p>
      ) : null}
      <form action={formAction} className="mt-3 flex flex-wrap gap-2">
        <input type="hidden" name="event_type" value={shiftOpen ? "clock_out" : "clock_in"} />
        <Button type="submit" variant="primary" className="min-h-10">
          {shiftOpen ? "Fichar salida" : "Fichar entrada"}
        </Button>
      </form>
    </div>
  );
}
