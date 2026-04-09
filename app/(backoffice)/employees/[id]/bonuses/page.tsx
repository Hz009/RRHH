import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createMonthlyBonusAction, deleteMonthlyBonusAction, updateMonthlyBonusAction } from "@/app/(backoffice)/employees/[id]/bonuses/actions";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { matchPayrollSelectValue, payrollCurrencySelectOptions } from "@/lib/countries";
import { formatCurrency, formatDate, formatDateOnlyLocal, toDateInputValue } from "@/lib/utils";
import { getMonthlyBonusesForEmployee, getPaidPeriodMonthsForEmployee } from "@/services/bonuses.service";
import { getCurrentEmployee, getCurrentUserRole, getEmployeeById } from "@/services/employees.service";

interface BonusesPageProps {
  params: { id: string };
  searchParams: { saved?: string; error?: string };
}

function todayYmdLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function EmployeeBonusesPage({ params, searchParams }: BonusesPageProps) {
  const [role, currentEmployee, employee] = await Promise.all([
    getCurrentUserRole(),
    getCurrentEmployee(),
    getEmployeeById(params.id),
  ]);

  if (!employee) notFound();

  const canView =
    role === "admin" ||
    (role === "manager" &&
      currentEmployee &&
      (employee.id === currentEmployee.id || employee.manager_id === currentEmployee.id)) ||
    (role === "employee" && currentEmployee && employee.id === currentEmployee.id);

  if (!canView) {
    redirect("/employees");
  }

  const bonuses = await getMonthlyBonusesForEmployee(params.id);

  const isAdmin = role === "admin";

  const uniquePeriods = [...new Set(bonuses.map((b) => String(b.period_month).slice(0, 7)))];
  const paidPeriods = await getPaidPeriodMonthsForEmployee(params.id, uniquePeriods);

  const bonusCurrencySelectClass =
    "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm disabled:opacity-60";
  const addBonusCurrencyOptions = payrollCurrencySelectOptions(employee.current_salary_currency);
  const addBonusCurrencyDefault = matchPayrollSelectValue(
    employee.current_salary_currency,
    addBonusCurrencyOptions,
    "USD"
  );

  return (
    <div>
      <Topbar
        title={`Bonos: ${employee.full_name}`}
        subtitle="Montos extra por mes con fecha y concepto. Solo editables hasta registrar el pago del mes."
      />
      <div className="space-y-6 p-6">
        {searchParams.saved === "create" ? (
          <Card className="border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Bono registrado.</Card>
        ) : null}
        {searchParams.saved === "update" ? (
          <Card className="border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Bono actualizado.</Card>
        ) : null}
        {searchParams.saved === "delete" ? (
          <Card className="border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Bono eliminado.</Card>
        ) : null}
        {searchParams.error ? (
          <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{searchParams.error}</Card>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link href={`/employees/${employee.id}`}>
            <Button variant="ghost" type="button">
              Volver al perfil 360
            </Button>
          </Link>
        </div>

        {isAdmin ? (
          <Card title="Añadir bono">
            <form action={createMonthlyBonusAction} className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
              <input type="hidden" name="employee_id" value={employee.id} />
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-zinc-700">Fecha del bono</label>
                <Input name="bonus_date" type="date" required defaultValue={todayYmdLocal()} />
                <p className="mt-1 text-xs text-zinc-500">
                  El mes de la nomina es el del dia elegido. Por defecto se abre con la fecha de hoy.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-700">Monto</label>
                <Input name="amount" type="number" step="0.01" min={0.01} required />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-700">Moneda</label>
                <select
                  name="currency"
                  required
                  defaultValue={addBonusCurrencyDefault}
                  className={bonusCurrencySelectClass}
                >
                  {addBonusCurrencyOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-zinc-500">
                  Debe ser la misma moneda que la nomina de ese mes (historial de compensacion). Si no coincide, no se
                  guardara.
                </p>
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <label className="mb-1 block text-sm text-zinc-700">Concepto</label>
                <Input name="concept" placeholder="Ej. bono por desempeno, asignacion unica..." required />
              </div>
              <div className="md:col-span-2 lg:col-span-6">
                <ConfirmSubmitButton type="submit" confirmMessage="Confirma registrar este bono para la fecha seleccionada.">
                  Guardar bono
                </ConfirmSubmitButton>
              </div>
            </form>
          </Card>
        ) : (
          <Card title="Permisos">
            <p className="text-sm text-zinc-600">
              Solo el administrador puede crear o modificar bonos. Puedes consultar los registrados a continuacion.
            </p>
          </Card>
        )}

        <Card title="Bonos registrados">
          {bonuses.length === 0 ? (
            <p className="text-sm text-zinc-500">No hay bonos cargados para este colaborador.</p>
          ) : (
            <div className="space-y-4">
              {bonuses.map((b) => {
                const ym = String(b.period_month).slice(0, 7);
                const locked = paidPeriods.has(ym);
                const editCurrencyOptions = payrollCurrencySelectOptions(b.currency);
                const editCurrencyDefault = matchPayrollSelectValue(b.currency, editCurrencyOptions, "USD");
                return (
                  <div key={b.id} className="rounded-xl border border-lm-aqua/15 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm">
                        <span className="font-semibold text-zinc-900">{formatDateOnlyLocal(b.bonus_date)}</span>
                        <span className="text-zinc-500"> · nomina {ym}</span>
                        <span className="ml-2 font-medium text-lm-dark-teal">{formatCurrency(b.amount, b.currency)}</span>
                      </div>
                      {locked ? (
                        <Badge variant="default">Mes pagado (bloqueado)</Badge>
                      ) : (
                        <Badge variant="warning">Editable</Badge>
                      )}
                    </div>
                    <p className="text-sm text-zinc-700">
                      <span className="font-medium text-zinc-600">Concepto:</span> {b.concept}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">Registrado: {formatDate(b.created_at)}</p>
                    {isAdmin && !locked ? (
                      <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
                        <form action={updateMonthlyBonusAction} className="grid gap-2 md:grid-cols-2 lg:grid-cols-6">
                          <input type="hidden" name="id" value={b.id} />
                          <input type="hidden" name="employee_id" value={employee.id} />
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs text-zinc-600">Fecha del bono</label>
                            <Input
                              name="bonus_date"
                              type="date"
                              required
                              defaultValue={toDateInputValue(b.bonus_date)}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-zinc-600">Monto</label>
                            <Input name="amount" type="number" step="0.01" defaultValue={b.amount} required />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-zinc-600">Moneda</label>
                            <select
                              name="currency"
                              required
                              defaultValue={editCurrencyDefault}
                              className={bonusCurrencySelectClass}
                            >
                              {editCurrencyOptions.map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-[10px] text-zinc-500">Igual que la nomina del mes del bono.</p>
                          </div>
                          <div className="md:col-span-2 lg:col-span-2">
                            <label className="mb-1 block text-xs text-zinc-600">Concepto</label>
                            <Input name="concept" defaultValue={b.concept} required />
                          </div>
                          <div className="md:col-span-2 lg:col-span-6 flex flex-wrap gap-2">
                            <ConfirmSubmitButton
                              type="submit"
                              className="h-9 px-3 text-xs"
                              confirmMessage="Confirma guardar los cambios de este bono."
                            >
                              Guardar cambios
                            </ConfirmSubmitButton>
                          </div>
                        </form>
                        <form action={deleteMonthlyBonusAction}>
                          <input type="hidden" name="id" value={b.id} />
                          <input type="hidden" name="employee_id" value={employee.id} />
                          <ConfirmSubmitButton
                            type="submit"
                            variant="danger"
                            className="h-9 px-3 text-xs"
                            confirmMessage="Confirma eliminar este bono. Esta accion no se puede deshacer."
                          >
                            Eliminar bono
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
