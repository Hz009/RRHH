"use client";

import { useFormState } from "react-dom";
import { useRef, useEffect, useState, useMemo } from "react";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";

interface VacationRequestFormProps {
  action: (
    prevState: { error?: string; success?: boolean } | null,
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean }>;
  employees: Array<{ id: string; full_name: string }>;
  currentEmployeeId: string | null;
  currentEmployeeName: string | null;
  canCreateForOthers: boolean;
  isAdmin: boolean;
  availableDaysByEmployee: Record<string, number>;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function VacationRequestForm({
  action,
  employees,
  currentEmployeeId,
  currentEmployeeName,
  canCreateForOthers,
  isAdmin,
  availableDaysByEmployee,
}: VacationRequestFormProps) {
  const [state, formAction] = useFormState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  const today = new Date().toISOString().slice(0, 10);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    canCreateForOthers ? employees[0]?.id ?? "" : currentEmployeeId ?? ""
  );
  const [startDate, setStartDate] = useState("");

  const availableDays = availableDaysByEmployee[selectedEmployeeId] ?? 0;

  const endDateMin = startDate || (isAdmin ? "" : today);

  const endDateMax = useMemo(() => {
    if (!startDate || availableDays <= 0) return "";
    return addDays(startDate, availableDays - 1);
  }, [startDate, availableDays]);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setStartDate("");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state?.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      ) : null}

      {state?.success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm text-emerald-700">
            Solicitud registrada correctamente.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-5">
        <div>
          <label className="mb-1 block text-sm text-zinc-700">Empleado</label>
          {canCreateForOthers ? (
            <select
              name="employee_id"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
              required
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name}
                </option>
              ))}
            </select>
          ) : (
            <>
              <Input value={currentEmployeeName ?? ""} readOnly disabled />
              <input
                type="hidden"
                name="employee_id"
                value={currentEmployeeId ?? ""}
              />
            </>
          )}
          <p className="mt-1 text-xs text-zinc-500">
            Dias disponibles:{" "}
            <span className="font-semibold text-emerald-700">
              {availableDays}
            </span>
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-700">
            Fecha inicio
          </label>
          <Input
            name="start_date"
            type="date"
            required
            min={isAdmin ? undefined : today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-700">Fecha fin</label>
          <Input
            name="end_date"
            type="date"
            required
            min={endDateMin || undefined}
            max={endDateMax || undefined}
            disabled={!startDate}
          />
          {startDate && availableDays > 0 ? (
            <p className="mt-1 text-xs text-zinc-500">
              Max: {endDateMax} ({availableDays} dias)
            </p>
          ) : null}
          {availableDays <= 0 ? (
            <p className="mt-1 text-xs text-red-600">
              Sin dias disponibles.
            </p>
          ) : null}
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm text-zinc-700">Motivo</label>
          <Input name="reason" placeholder="Viaje, descanso, etc." />
        </div>
      </div>

      <ConfirmSubmitButton
        type="submit"
        confirmMessage="Confirma que deseas registrar esta solicitud de vacaciones."
        disabled={availableDays <= 0}
      >
        Guardar solicitud
      </ConfirmSubmitButton>
    </form>
  );
}
