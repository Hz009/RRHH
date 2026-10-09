"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";

import { resetEmployeePasswordAction } from "@/app/(backoffice)/employees/actions";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";

const labelClass = "mb-1 block text-sm font-medium text-lm-dark-teal";

export function EmployeePasswordForm({ employeeId }: { employeeId: string }) {
  const [state, formAction] = useFormState(resetEmployeePasswordAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state?.ok]);

  return (
    <form ref={formRef} action={formAction} className="grid max-w-md gap-4">
      <input type="hidden" name="employee_id" value={employeeId} />
      <p className="text-sm text-zinc-600">
        Cambia la contraseña del usuario de acceso asociado al email del empleado (Supabase Auth).
      </p>
      {state?.error ? (
        <div className="rounded-xl border border-lm-orange/40 bg-lm-orange-light p-3 text-sm text-lm-orange">{state.error}</div>
      ) : null}
      {state?.ok ? (
        <div className="rounded-xl border border-lm-aqua/40 bg-lm-sky p-3 text-sm text-lm-dark-teal">
          Contraseña actualizada correctamente.
        </div>
      ) : null}
      <div>
        <label className={labelClass}>Nueva contraseña</label>
        <Input type="password" name="new_password" autoComplete="new-password" minLength={8} required />
      </div>
      <div>
        <label className={labelClass}>Confirmar contraseña</label>
        <Input type="password" name="confirm_password" autoComplete="new-password" minLength={8} required />
      </div>
      <ConfirmSubmitButton type="submit" variant="primary" className="w-full sm:w-auto" confirmMessage="Confirma que deseas actualizar esta contrasena.">
        Actualizar contraseña
      </ConfirmSubmitButton>
    </form>
  );
}
