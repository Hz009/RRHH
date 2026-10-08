import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, Notice } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { matchPayrollSelectValue, payrollCurrencySelectOptions } from "@/lib/countries";
import { formatCurrency, formatDate } from "@/lib/utils";
import { canViewEmployeeRecord, getCurrentEmployee, getCurrentUserRole, getEmployeeById, getSalaryHistory } from "@/services/employees.service";
import { getPaymentHistoryForEmployee } from "@/services/payments.service";
import { addSalaryRecordAction, deleteSalaryRecordAction, updateSalaryRecordAction } from "@/app/(backoffice)/employees/actions";

interface EmployeeSalaryPageProps {
  params: {
    id: string;
  };
  searchParams: {
    saved?: string;
    view?: string;
  };
}

export default async function EmployeeSalaryPage({ params, searchParams }: EmployeeSalaryPageProps) {
  const [employee, history, role, paymentHistory, currentEmployee] = await Promise.all([
    getEmployeeById(params.id),
    getSalaryHistory(params.id),
    getCurrentUserRole(),
    getPaymentHistoryForEmployee(params.id, 36),
    getCurrentEmployee(),
  ]);
  if (!employee) notFound();
  if (!(await canViewEmployeeRecord(role, currentEmployee?.id, employee.id))) redirect("/employees");
  const isAdmin = role === "admin";
  const salarySaved = searchParams.saved === "salary";
  const salaryUpdated = searchParams.saved === "salary_update";
  const salaryDeleted = searchParams.saved === "salary_delete";
  const showAllHistory = searchParams.view === "all";
  const visibleHistory = showAllHistory ? history : history.slice(0, 3);
  const hasMoreHistory = history.length > 3;

  const viewMoreHref = `/employees/${params.id}/salary?view=all`;
  const viewLessHref = `/employees/${params.id}/salary`;
  const chartData = [...paymentHistory].slice(0, 12).reverse();

  const addSalaryCurrencyOptions = payrollCurrencySelectOptions(employee.current_salary_currency);
  const addSalaryCurrencyDefault = matchPayrollSelectValue(
    employee.current_salary_currency,
    addSalaryCurrencyOptions,
    "USD"
  );
  const salarySelectClass =
    "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm disabled:opacity-60";

  return (
    <div>
      <Topbar
        title={employee.employee_type === "hourly" ? `Tarifa: ${employee.full_name}` : `Salario: ${employee.full_name}`}
        subtitle={
          employee.employee_type === "hourly"
            ? "Precio por hora e historial de la tarifa."
            : "Salario actual e historial salarial del empleado."
        }
      />
      <div className="grid gap-6 p-6 lg:grid-cols-3">
        {salarySaved ? <Notice tone="success" className="lg:col-span-3">Se guardo el cambio en el historial salarial.</Notice> : null}
        {salaryUpdated ? <Notice tone="success" className="lg:col-span-3">Se actualizo el registro salarial correctamente.</Notice> : null}
        {salaryDeleted ? <Notice tone="success" className="lg:col-span-3">Se elimino el registro salarial correctamente.</Notice> : null}
        <Card title={employee.employee_type === "hourly" ? "Tarifa por hora" : "Salario actual"} className="lg:col-span-1">
          <p className="text-3xl font-bold text-zinc-900">
            {formatCurrency(employee.current_salary_amount, employee.current_salary_currency)}
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Vigente desde:{" "}
            {employee.current_salary_effective_date ? formatDate(employee.current_salary_effective_date) : "No definido"}
          </p>
          <div className="mt-3">
            <Badge variant="info">{employee.current_salary_currency}</Badge>
          </div>
        </Card>

        <Card title="Agregar registro salarial" className="lg:col-span-2">
          <form action={addSalaryRecordAction} className="grid gap-3 md:grid-cols-4">
            <input type="hidden" name="employee_id" value={employee.id} />
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Monto</label>
              <Input name="amount" type="number" step="0.01" required disabled={!isAdmin} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Moneda</label>
              <select
                name="currency"
                required
                defaultValue={addSalaryCurrencyDefault}
                disabled={!isAdmin}
                className={salarySelectClass}
              >
                {addSalaryCurrencyOptions.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Fecha de inicio</label>
              <Input name="effective_date" type="date" required disabled={!isAdmin} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Motivo</label>
              <Input name="reason" placeholder="Promocion, ajuste, etc." disabled={!isAdmin} />
            </div>
            {isAdmin ? (
              <div className="md:col-span-4">
                <ConfirmSubmitButton
                  type="submit"
                  confirmMessage="Confirma que deseas guardar este cambio salarial en el historial."
                >
                  Guardar en historial
                </ConfirmSubmitButton>
              </div>
            ) : null}
          </form>
        </Card>

        <Card title="Historial salarial" className="lg:col-span-3">
          <div className="space-y-3">
            {visibleHistory.map((record, index) => {
              const isLatestRecord = index === 0;
              const rowCurrencyOptions = payrollCurrencySelectOptions(record.currency);
              const rowCurrencyDefault = matchPayrollSelectValue(record.currency, rowCurrencyOptions, "USD");

              return (
              <form key={record.id} action={updateSalaryRecordAction} className="rounded-lg border border-zinc-200 p-3">
                <input type="hidden" name="id" value={record.id} />
                <input type="hidden" name="employee_id" value={employee.id} />
                <div className="grid gap-3 md:grid-cols-5">
                  <div>
                    <label className="mb-1 block text-xs text-zinc-700">Monto</label>
                    <Input
                      name="amount"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={record.amount}
                      disabled={!isAdmin || !isLatestRecord}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-700">Moneda</label>
                    <select
                      name="currency"
                      required
                      defaultValue={rowCurrencyDefault}
                      disabled={!isAdmin || !isLatestRecord}
                      className={salarySelectClass}
                    >
                      {rowCurrencyOptions.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-700">Fecha de inicio</label>
                    <Input
                      name="effective_date"
                      type="date"
                      required
                      defaultValue={record.effective_date}
                      disabled={!isAdmin || !isLatestRecord}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs text-zinc-700">Motivo</label>
                    <Input name="reason" defaultValue={record.reason ?? ""} disabled={!isAdmin || !isLatestRecord} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-zinc-500">
                    Registro: {formatDate(record.created_at)} | Monto actual de este registro:{" "}
                    {formatCurrency(record.amount, record.currency)}
                  </p>
                    {isAdmin && isLatestRecord ? (
                    <div className="flex gap-2">
                      <ConfirmSubmitButton
                        type="submit"
                        className="h-8 px-3 text-xs"
                        confirmMessage="Confirma que deseas actualizar este registro salarial."
                      >
                        Guardar cambios
                      </ConfirmSubmitButton>
                      <ConfirmSubmitButton
                        type="submit"
                        formAction={deleteSalaryRecordAction}
                        variant="danger"
                        className="h-8 px-3 text-xs"
                        confirmMessage="Confirma que deseas eliminar este registro salarial."
                      >
                        Eliminar
                      </ConfirmSubmitButton>
                    </div>
                  ) : null}
                </div>
              </form>
              );
            })}
            {hasMoreHistory ? (
              <div className="pt-1">
                <Link
                  href={showAllHistory ? viewLessHref : viewMoreHref}
                  className="text-sm font-medium text-lm-dark-teal hover:text-lm-aqua"
                >
                  {showAllHistory ? "Ver menos cambios" : `Ver mas cambios (${history.length - 3} adicionales)`}
                </Link>
              </div>
            ) : null}
          </div>
        </Card>

        <Card title="Pagos registrados mes a mes" className="lg:col-span-3">
          {paymentHistory.length === 0 ? (
            <p className="text-sm text-zinc-500">Aun no hay pagos registrados para este empleado.</p>
          ) : (
            <MiniBarChart
              points={chartData.map((payment) => ({
                label: payment.periodMonth,
                value: payment.amountPaid,
              }))}
              currency={chartData[chartData.length - 1]?.currency ?? employee.current_salary_currency}
            />
          )}
        </Card>
      </div>
    </div>
  );
}

const MONTH_ABBREV_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

function monthThreeLettersFromPeriod(label: string): string {
  const trimmed = label.trim();
  const match = /^(\d{4})-(\d{2})$/.exec(trimmed);
  if (!match) return trimmed;
  const monthNum = Number.parseInt(match[2], 10);
  if (monthNum < 1 || monthNum > 12) return trimmed;
  const abbrev = MONTH_ABBREV_ES[monthNum - 1];
  return abbrev.charAt(0).toUpperCase() + abbrev.slice(1);
}

function MiniBarChart({
  points,
  currency,
}: {
  points: Array<{ label: string; value: number }>;
  currency: string;
}) {
  if (points.length === 0) return null;

  const width = 900;
  const height = 260;
  const leftPad = 36;
  const rightPad = 20;
  const topPad = 48;
  const bottomPad = 44;
  const amountOffsetAboveBar = 10;
  const innerWidth = width - leftPad - rightPad;
  const innerHeight = height - topPad - bottomPad;

  const amounts = points.map((p) => p.value);
  const maxValue = Math.max(...amounts, 1);
  const n = points.length;
  const gap = Math.min(14, innerWidth / (n * 4));
  const barWidth = Math.max((innerWidth - gap * (n + 1)) / n, 8);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span>
          {n === 12 ? "Ultimos 12 meses con pago registrado" : `${n} mes${n === 1 ? "" : "es"} con pago registrado`}
        </span>
        <span>Max: {formatCurrency(maxValue, currency)}</span>
      </div>
      <div className="rounded-xl border border-lm-aqua/15 bg-white p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
          <defs>
            <linearGradient id="lmBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#39b4b3" />
              <stop offset="100%" stopColor="#186e74" />
            </linearGradient>
          </defs>
          <line
            x1={leftPad}
            y1={topPad}
            x2={leftPad}
            y2={height - bottomPad}
            stroke="#d4d4d8"
            strokeWidth="1"
          />
          <line
            x1={leftPad}
            y1={height - bottomPad}
            x2={width - rightPad}
            y2={height - bottomPad}
            stroke="#d4d4d8"
            strokeWidth="1"
          />
          {points.map((point, index) => {
            const x = leftPad + gap + index * (barWidth + gap);
            const barH = (point.value / maxValue) * innerHeight;
            const y = height - bottomPad - barH;
            const amountText = formatCurrency(point.value, currency);
            const monthLabel = monthThreeLettersFromPeriod(point.label);
            const amountY = y - amountOffsetAboveBar;
            return (
              <g key={point.label}>
                <title>{`${point.label}: ${amountText}`}</title>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barH, 2)}
                  rx={4}
                  fill="url(#lmBarGrad)"
                  className="opacity-95"
                />
                <text
                  x={x + barWidth / 2}
                  y={amountY}
                  textAnchor="middle"
                  dominantBaseline="auto"
                  className="fill-zinc-800"
                  style={{ fontSize: 11, fontWeight: 700 }}
                >
                  {amountText}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={height - bottomPad + 20}
                  textAnchor="middle"
                  className="fill-zinc-500"
                  style={{ fontSize: 12 }}
                >
                  {monthLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
