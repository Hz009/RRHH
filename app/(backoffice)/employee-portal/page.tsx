import Link from "next/link";
import { redirect } from "next/navigation";

import { TimeClockCard } from "@/components/employee-portal/time-clock-card";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { employeeTypeLabel, paymentMethodLabel } from "@/lib/employee-display";
import { formatCurrency, formatDateOnlyLocal } from "@/lib/utils";
import { getLastPunchEvent, isShiftOpenFromLastEvent } from "@/services/attendance.service";
import { getCurrentEmployee, getMySalaryHistory } from "@/services/employees.service";
import { getFlexHoursBalance } from "@/services/flex-hours.service";
import { getMyPaymentHistoryDetailed, getMyPayrollOverview } from "@/services/payments.service";

export default async function EmployeePortalPage() {
  const currentEmployee = await getCurrentEmployee();
  if (!currentEmployee) {
    redirect("/dashboard");
  }

  const showPunch =
    currentEmployee.employee_type === "hourly" &&
    (currentEmployee.hourly_hours_source ?? "manual_monthly") === "punch";

  const [payments, payrollMonths, salaryHistory, lastPunch, flexBal] = await Promise.all([
    getMyPaymentHistoryDetailed(),
    getMyPayrollOverview(),
    getMySalaryHistory(),
    showPunch ? getLastPunchEvent(currentEmployee.id) : Promise.resolve(null),
    currentEmployee.employee_type === "full_time" || currentEmployee.employee_type === "part_time"
      ? getFlexHoursBalance(currentEmployee.id)
      : Promise.resolve(null),
  ]);

  const shiftOpen = showPunch ? isShiftOpenFromLastEvent(lastPunch) : false;

  return (
    <div>
      <Topbar
        title="Portal del empleado"
        subtitle={
          showPunch
            ? "Ficha tu entrada o salida al inicio; luego consulta perfil y pagos."
            : "Consulta tu perfil y tu historico de pagos."
        }
      />
      <div className="space-y-6 p-6">
        {showPunch ? (
          <div className="space-y-2">
            <TimeClockCard shiftOpen={shiftOpen} />
            <p className="text-center text-xs text-zinc-500">
              <Link href={`/employees/${currentEmployee.id}/time`} className="text-lm-dark-teal underline">
                Ver historial de fichajes
              </Link>
            </p>
          </div>
        ) : null}

        <Card title="Mi perfil">
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>
              <span className="font-medium text-zinc-700">Nombre:</span> {currentEmployee.full_name}
            </p>
            <p className="md:col-span-2">
              <Link href="/employee-portal/datos" className="text-lm-dark-teal underline">
                Editar mis datos
              </Link>
            </p>
            <p>
              <span className="font-medium text-zinc-700">Email:</span> {currentEmployee.email}
            </p>
            <p>
              <span className="font-medium text-zinc-700">Departamento:</span> {currentEmployee.department}
            </p>
            <p>
              <span className="font-medium text-zinc-700">Cargo:</span> {currentEmployee.job_title}
            </p>
            <p>
              <span className="font-medium text-zinc-700">Sueldo actual:</span>{" "}
              {formatCurrency(Number(currentEmployee.current_salary_amount ?? 0), currentEmployee.current_salary_currency || "USD")}
            </p>
          </div>
        </Card>

        <Card title="Historial salarial">
          {salaryHistory.length === 0 ? (
            <p className="text-sm text-zinc-500">Aun no hay cambios de sueldo registrados.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {salaryHistory.map((row) => (
                <li key={row.id}>
                  {formatDateOnlyLocal(row.effective_date)} · {formatCurrency(Number(row.amount), row.currency)}
                  {row.reason ? ` · ${row.reason}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Pagos hechos y pendientes">
          <Table>
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Mes</th>
                  <th className="px-4 py-3 font-medium">A pagar</th>
                  <th className="px-4 py-3 font-medium">Pagado</th>
                  <th className="px-4 py-3 font-medium">Pendiente</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Boleta</th>
                </tr>
              </thead>
              <tbody>
                {payrollMonths.map((row) => (
                  <tr key={row.periodMonth} className="border-t border-zinc-200">
                    <td className="px-4 py-3">{row.periodMonth}</td>
                    <td className="px-4 py-3">{formatCurrency(row.amountDue, row.currency)}</td>
                    <td className="px-4 py-3">{formatCurrency(row.amountPaid, row.currency)}</td>
                    <td className="px-4 py-3">{formatCurrency(row.pending, row.currency)}</td>
                    <td className="px-4 py-3">{row.paid ? "Pagado" : "Pendiente"}</td>
                    <td className="px-4 py-3">
                      <Link href={`/employee-portal/boleta?month=${row.periodMonth}`} className="text-lm-dark-teal underline">
                        Ver boleta
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Table>
        </Card>

        {flexBal !== null ? (
          <Card title="Bolsa de horas (libres / repone)">
            <p className="text-sm">
              Saldo actual:{" "}
              <span className="font-semibold text-lm-dark-teal">{flexBal.toFixed(2)} h</span>
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Los movimientos los registra administracion.{" "}
              <Link href={`/employees/${currentEmployee.id}/time`} className="text-lm-dark-teal underline">
                Ver detalle
              </Link>
            </p>
          </Card>
        ) : null}

        <Card title="Historico de pagos">
          {payments.length === 0 ? (
            <p className="text-sm text-zinc-500">Aun no tienes pagos registrados.</p>
          ) : (
            <Table>
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-left text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Mes</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Metodo</th>
                    <th className="px-4 py-3 font-medium">Base nomina</th>
                    <th className="px-4 py-3 font-medium">Bonos</th>
                    <th className="px-4 py-3 font-medium">Horas</th>
                    <th className="px-4 py-3 font-medium">Total pagado</th>
                    <th className="px-4 py-3 font-medium">Detalle bonos</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((row) => (
                    <tr key={row.id} className="border-t border-zinc-200">
                      <td className="px-4 py-3">{row.periodMonth}</td>
                      <td className="px-4 py-3">{employeeTypeLabel[row.employeeType] ?? row.employeeType}</td>
                      <td className="px-4 py-3">{paymentMethodLabel[row.paymentMethod] ?? row.paymentMethod}</td>
                      <td className="px-4 py-3">{formatCurrency(row.salaryPortion, row.currency)}</td>
                      <td className="px-4 py-3">
                        {row.bonusTotalInPayCurrency > 0 ? (
                          <span className="font-medium text-lm-dark-teal">
                            {formatCurrency(row.bonusTotalInPayCurrency, row.currency)}
                          </span>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{row.employeeType === "hourly" ? row.hoursWorked.toFixed(2) : "N/A"}</td>
                      <td className="px-4 py-3 font-medium text-lm-dark-teal">
                        {formatCurrency(row.amountPaid, row.currency)}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-xs text-zinc-600">
                        {row.bonusLines.length === 0 ? (
                          <span className="text-zinc-400">-</span>
                        ) : (
                          <ul className="list-inside list-disc space-y-1">
                            {row.bonusLines.map((b) => (
                              <li key={b.id}>
                                {formatCurrency(b.amount, b.currency)} — {b.concept}
                                {b.currency !== row.currency ? (
                                  <span className="text-amber-700"> (moneda distinta a la nomina)</span>
                                ) : null}
                                <span className="text-zinc-400"> ({formatDateOnlyLocal(b.bonusDate)})</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
