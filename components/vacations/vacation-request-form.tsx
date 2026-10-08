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
  employees: Array<{ id: string; full_name: string; employee_type?: string; hire_date?: string }>;
  currentEmployeeId: string | null;
  currentEmployeeName: string | null;
  currentEmployeeType?: string | null;
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
  currentEmployeeType = null,
  canCreateForOthers,
  isAdmin,
  availableDaysByEmployee,
}: VacationRequestFormProps) {
  const [state, formAction] = useFormState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  const today = new Date().toISOString().slice(0, 10);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    currentEmployeeId && employees.some((employee) => employee.id === currentEmployeeId)
      ? currentEmployeeId
      : employees[0]?.id ?? ""
  );
  const selectedType = canCreateForOthers
    ? employees.find((employee) => employee.id === selectedEmployeeId)?.employee_type
    : currentEmployeeType;
  const vacationAllowed = selectedType !== "hourly";
  const [kind, setKind] = useState<"vacation" | "permission">(vacationAllowed ? "vacation" : "permission");
  const [startDate, setStartDate] = useState("");
  const isPermission = kind === "permission";

  const availableDays = availableDaysByEmployee[selectedEmployeeId] ?? 0;
  const hireDate = employees.find((employee) => employee.id === selectedEmployeeId)?.hire_date ?? "";
  const startMin = isAdmin ? hireDate : [today, hireDate].filter(Boolean).sort().at(-1) ?? "";
  const endDateMin = startDate ? [startDate, startMin].filter(Boolean).sort().at(-1) ?? "" : startMin;

  const endDateMax = useMemo(() => {
    if (!startDate || availableDays <= 0) return "";
    return addDays(startDate, availableDays - 1);
  }, [startDate, availableDays]);

  useEffect(() => {
    if (!vacationAllowed && kind === "vacation") setKind("permission");
  }, [vacationAllowed, kind]);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setStartDate("");
      setKind(vacationAllowed ? "vacation" : "permission");
    }
  }, [state, vacationAllowed]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state?.error ? (
        <div className="rounded-xl border border-lm-orange/40 bg-lm-orange-light p-3">
          <p className="text-sm text-lm-orange">{state.error}</p>
        </div>
      ) : null}

      {state?.success ? (
        <div className="rounded-xl border border-lm-aqua/40 bg-lm-sky p-3">
          <p className="text-sm text-lm-dark-teal">
            Solicitud registrada correctamente.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-6">
        <div>
          <label className="mb-1 block text-sm text-zinc-700">Tipo</label>
          <select
            name="request_kind"
            value={vacationAllowed ? kind : "permission"}
            onChange={(event) => setKind(event.target.value === "permission" ? "permission" : "vacation")}
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
          >
            {vacationAllowed ? <option value="vacation">Vacaciones</option> : null}
            <option value="permission">Permiso</option>
          </select>
        </div>
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
            {isPermission ? "El permiso no descuenta días de vacaciones." : (
              <>
                Dias disponibles:{" "}
                <span className="font-semibold text-lm-dark-teal">{availableDays}</span>
              </>
            )}
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
            min={startMin || undefined}
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
            max={isPermission ? undefined : endDateMax || undefined}
            disabled={!startDate}
          />
          {startDate && !isPermission && availableDays > 0 ? (
            <p className="mt-1 text-xs text-zinc-500">
              Max: {endDateMax} ({availableDays} dias)
            </p>
          ) : null}
          {!isPermission && availableDays <= 0 ? (
            <p className="mt-1 text-xs text-lm-orange">
              Sin dias disponibles.
            </p>
          ) : null}
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm text-zinc-700">{isPermission ? "Tema del permiso" : "Motivo"}</label>
          <Input name="reason" required={isPermission} placeholder={isPermission ? "El motivo concreto" : "Viaje, descanso, etc."} />
        </div>
      </div>

      <ConfirmSubmitButton
        type="submit"
        confirmMessage={isPermission ? "Confirma que deseas registrar este permiso." : "Confirma que deseas registrar esta solicitud de vacaciones."}
        disabled={!isPermission && availableDays <= 0}
      >
        Guardar solicitud
      </ConfirmSubmitButton>
    </form>
  );
}
