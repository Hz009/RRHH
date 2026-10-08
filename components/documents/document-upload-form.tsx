"use client";

import { useFormState } from "react-dom";
import { useRef, useEffect } from "react";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";

interface DocumentUploadFormProps {
  action: (
    prevState: { error?: string; success?: boolean } | null,
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean }>;
  employees: Array<{ id: string; full_name: string }>;
}

export function DocumentUploadForm({
  action,
  employees,
}: DocumentUploadFormProps) {
  const [state, formAction] = useFormState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      encType="multipart/form-data"
      className="space-y-4"
    >
      {state?.error ? (
        <div className="rounded-xl border border-lm-orange/40 bg-lm-orange-light p-3">
          <p className="text-sm text-lm-orange">{state.error}</p>
        </div>
      ) : null}

      {state?.success ? (
        <div className="rounded-xl border border-lm-aqua/40 bg-lm-sky p-3">
          <p className="text-sm text-lm-dark-teal">
            Documento guardado correctamente.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm text-zinc-700">Titulo</label>
          <Input name="title" required placeholder="Nombre del documento" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-700">Categoria</label>
          <select
            name="category"
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
          >
            <option value="contract">Contrato</option>
            <option value="policy">Politica</option>
            <option value="evaluation">Evaluacion</option>
            <option value="payroll">Nomina</option>
            <option value="announcement">Anuncio</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-700">Archivo</label>
          <Input name="file" type="file" required />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-700">
            Asignar a empleado
          </label>
          <select
            name="employee_id"
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
          >
            <option value="">Sin empleado (global)</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-zinc-700">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="is_global" />
          Documento global
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="requires_ack" defaultChecked />
          Requerir Confirmacion
        </label>
      </div>

      <ConfirmSubmitButton
        type="submit"
        confirmMessage="Confirmas que deseas crear este documento?"
      >
        Guardar documento
      </ConfirmSubmitButton>
    </form>
  );
}
