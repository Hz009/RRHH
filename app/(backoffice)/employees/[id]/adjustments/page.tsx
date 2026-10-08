import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  createPayAdjustmentAction,
  deactivatePayAdjustmentAction,
} from "@/app/(backoffice)/employees/[id]/adjustments/actions";
import { PayAdjustmentForm } from "@/components/employees/pay-adjustment-form";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Card, Notice } from "@/components/ui/card";
import { recurrenceLabel } from "@/lib/payslip";
import { formatCurrency } from "@/lib/utils";
import { describeAdjustment, listPayAdjustments } from "@/services/pay-adjustments.service";
import { canViewEmployeeRecord, getCurrentEmployee, getCurrentUserRole, getEmployeeById } from "@/services/employees.service";

interface AdjustmentsPageProps {
  params: { id: string };
  searchParams: { saved?: string; error?: string };
}

export default async function AdjustmentsPage({ params, searchParams }: AdjustmentsPageProps) {
  const [role, currentEmployee, employee, rows] = await Promise.all([
    getCurrentUserRole(),
    getCurrentEmployee(),
    getEmployeeById(params.id),
    listPayAdjustments(params.id),
  ]);
  if (!employee) notFound();

  const canView = await canViewEmployeeRecord(role, currentEmployee?.id, employee.id);
  if (!canView) redirect("/employees");

  const isAdmin = role === "admin";

  return (
    <div>
      <Topbar title="Incentivos y descuentos" subtitle={employee.full_name} />
      <div className="space-y-6 p-6">
        <Link href={`/employees/${employee.id}`} className="text-sm text-lm-dark-teal underline">
          Volver a la ficha
        </Link>
        {searchParams.saved ? <Notice tone="success">Guardado.</Notice> : null}
        {searchParams.error ? <Notice tone="error">{searchParams.error}</Notice> : null}
        <Card title="Cómo se usan">
          <p className="text-sm text-zinc-600">
            El bono sigue en su propia pantalla. Aquí van los incentivos, que suman, y los descuentos, que restan.
            Puntual vale solo para el mes elegido. Mensual se repite desde ese mes. El préstamo no se escribe aquí: la boleta toma la cuota del préstamo activo.
            Los cuatro tipos de descuento son provisionales.
          </p>
        </Card>
        {isAdmin ? (
          <Card title="Nuevo">
            <form action={createPayAdjustmentAction}>
              <PayAdjustmentForm employeeId={employee.id} />
            </form>
          </Card>
        ) : null}
        <Card title="Registrados">
          {rows.length === 0 ? (
            <p className="text-sm text-zinc-500">Todavía no hay incentivos ni descuentos.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {rows.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2">
                  <div>
                    <p className="font-medium text-zinc-900">{describeAdjustment(row)}</p>
                    <p className="text-xs text-zinc-500">
                      {row.period_month} · {recurrenceLabel(row.recurrence)} · {formatCurrency(row.amount, row.currency)}
                      {row.active ? "" : " · inactivo"}
                    </p>
                    {row.comment ? <p className="text-xs text-zinc-600">{row.comment}</p> : null}
                  </div>
                  {isAdmin && row.active ? (
                    <form action={deactivatePayAdjustmentAction}>
                      <input type="hidden" name="employee_id" value={employee.id} />
                      <input type="hidden" name="id" value={row.id} />
                      <Button type="submit" variant="ghost">Quitar</Button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
