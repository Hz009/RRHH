"use client";

import { useFormState } from "react-dom";

import { updateDirectReportManagerAction } from "@/app/(backoffice)/employees/actions";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";

interface TeamManagerFormProps {
  employeeId: string;
  managerId: string;
  options: Array<{ id: string; full_name: string; email: string }>;
}

export function TeamManagerForm({ employeeId, managerId, options }: TeamManagerFormProps) {
  const [state, action] = useFormState(updateDirectReportManagerAction, null);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="employee_id" value={employeeId} />
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Manager asignado</label>
        <select
          name="manager_id"
          defaultValue={managerId}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm"
        >
          {options.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.full_name} ({manager.email})
            </option>
          ))}
        </select>
      </div>
      <ConfirmSubmitButton type="submit" confirmMessage="Confirma que deseas guardar este manager.">
        Guardar manager
      </ConfirmSubmitButton>
      {state?.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
    </form>
  );
}
