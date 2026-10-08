import type { Employee } from "@/types/domain";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";

interface LoanFormProps {
  action: (formData: FormData) => Promise<void>;
  employees: Employee[];
}

export function LoanForm({ action, employees }: LoanFormProps) {
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Empleado</label>
        <select name="employee_id" required className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm">
          <option value="">Seleccionar empleado</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.full_name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Descripcion</label>
        <Input name="description" required />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Monto principal</label>
        <Input name="principal_amount" type="number" step="0.01" min="0" required />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Moneda</label>
        <Input name="currency" defaultValue="USD" required />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Meses en los que se compromete a pagar</label>
        <Input name="installments_total" type="number" min="1" required />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Monto por cuota</label>
        <Input name="installment_amount" type="number" step="0.01" min="0" required />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Fecha en la que empieza a pagar</label>
        <Input name="start_date" type="date" required />
      </div>
      <div className="md:col-span-2">
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="payroll_deduction_enabled" />
          Aplicar descuento por nomina
        </label>
      </div>
      <div className="md:col-span-2">
        <ConfirmSubmitButton type="submit" confirmMessage="Confirma que deseas registrar este prestamo.">
          Registrar prestamo
        </ConfirmSubmitButton>
      </div>
    </form>
  );
}
