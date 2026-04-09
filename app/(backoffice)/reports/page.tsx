import Link from "next/link";
import { redirect } from "next/navigation";

import { registerMonthlyPaymentsAction, upsertMonthlyHoursAction } from "@/app/(backoffice)/reports/actions";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Table } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { getCurrentUserRole, getEmployees } from "@/services/employees.service";
import {
  filterSortPaginatePaymentPreviewRows,
  getCurrentMonthParam,
  getPaymentPreview,
} from "@/services/payments.service";

interface ReportsPageProps {
  searchParams: {
    month?: string;
    saved?: string;
    error?: string;
    employee?: string;
    emp_type?: string;
    pay_status?: string;
    payment_method?: string;
    page?: string;
  };
}

const typeLabel: Record<string, string> = {
  full_time: "Full time",
  part_time: "Part time",
  hourly: "Pago por horas",
};

const paymentLabel: Record<string, string> = {
  bank: "Banco",
  paypal: "PayPal",
  wise: "Wise",
};

function summarizeCurrencies(by: Record<string, number>): { headline: string; sub: string } {
  const entries = Object.entries(by).filter(([, v]) => v > 0);
  if (entries.length === 0) return { headline: formatCurrency(0, "USD"), sub: "Sin montos en la vista filtrada" };
  if (entries.length === 1) {
    const [c, a] = entries[0]!;
    return { headline: formatCurrency(a, c), sub: `Moneda ${c}` };
  }
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  return {
    headline: "Varias monedas",
    sub: sorted.map(([c, a]) => `${c}: ${formatCurrency(a, c)}`).join(" · "),
  };
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    redirect("/dashboard");
  }

  const sp = searchParams;
  const month = sp.month ?? getCurrentMonthParam();
  const employeeId = (sp.employee ?? "").trim();
  const empType = sp.emp_type ?? "all";
  const payStatus = (sp.pay_status ?? "all") as "all" | "pending" | "paid";
  const paymentMethod = sp.payment_method ?? "all";
  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);

  const [rows, staff] = await Promise.all([getPaymentPreview(month), getEmployees({ status: "active" })]);
  const staffSorted = [...staff].sort((a, b) => a.full_name.localeCompare(b.full_name));

  const { pageRows, total, page: safePage, pageSize, filteredAmountByCurrency } = filterSortPaginatePaymentPreviewRows(
    rows,
    {
      employeeId: employeeId || undefined,
      employeeType: empType,
      status: payStatus,
      paymentMethod,
    },
    page
  );

  const { headline, sub } = summarizeCurrencies(filteredAmountByCurrency);
  const hasHourlyWithoutHours = pageRows.some((row) => row.employeeType === "hourly" && row.monthHours <= 0);

  const listQuery: Record<string, string | undefined> = {
    month,
    ...(employeeId ? { employee: employeeId } : {}),
    ...(empType !== "all" ? { emp_type: empType } : {}),
    ...(payStatus !== "all" ? { pay_status: payStatus } : {}),
    ...(paymentMethod !== "all" ? { payment_method: paymentMethod } : {}),
  };

  const retQsParams = new URLSearchParams();
  if (employeeId) retQsParams.set("employee", employeeId);
  if (empType !== "all") retQsParams.set("emp_type", empType);
  if (payStatus !== "all") retQsParams.set("pay_status", payStatus);
  if (paymentMethod !== "all") retQsParams.set("payment_method", paymentMethod);
  if (safePage > 1) retQsParams.set("page", String(safePage));
  const retQs = retQsParams.toString();

  return (
    <div>
      <Topbar
        title="Portal de pagos"
        subtitle="Carga horas mensuales, registra pagos parciales y descarga TXT para contabilidad."
      />
      <div className="space-y-6 p-6">
        {sp.saved === "hours" ? (
          <Card className="border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Horas mensuales guardadas correctamente.
          </Card>
        ) : null}
        {sp.saved === "payments" ? (
          <Card className="border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Pagos del mes registrados correctamente en el historico.
          </Card>
        ) : null}
        {sp.error ? (
          <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{sp.error}</Card>
        ) : null}

        {hasHourlyWithoutHours ? (
          <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Hay empleados por hora sin horas cargadas para este mes. El monto saldra en 0 hasta registrar horas.
          </Card>
        ) : null}

        <Card>
          <form className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Mes de pago</label>
              <Input name="month" type="month" defaultValue={month} />
            </div>
            <Button type="submit">Actualizar vista</Button>
            <Link href={`/reports/export-txt?month=${month}`}>
              <Button variant="secondary">Descargar TXT</Button>
            </Link>
          </form>
        </Card>

        <Card>
          <form method="get" className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
            <input type="hidden" name="month" value={month} />
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Empleado</label>
              <select
                name="employee"
                defaultValue={employeeId}
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
              >
                <option value="">Todos</option>
                {staffSorted.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Tipo</label>
              <select
                name="emp_type"
                defaultValue={empType}
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
              >
                <option value="all">Todos</option>
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="hourly">Por horas</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Estado pago</label>
              <select
                name="pay_status"
                defaultValue={payStatus}
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="paid">Pagado</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Metodo de pago</label>
              <select
                name="payment_method"
                defaultValue={paymentMethod}
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
              >
                <option value="all">Todos</option>
                <option value="bank">Banco</option>
                <option value="paypal">PayPal</option>
                <option value="wise">Wise</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Aplicar filtros
              </Button>
            </div>
          </form>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Resumen (vista filtrada)">
            <p className="text-sm text-zinc-600">Monto total segun filtros</p>
            <p className="mt-2 text-2xl font-semibold text-lm-dark-teal">{headline}</p>
            <p className="mt-1 text-xs text-zinc-500">{sub}</p>
            <p className="mt-2 text-xs text-zinc-500">
              Mes: <span className="font-medium">{month}</span> · {total} filas en esta vista
            </p>
          </Card>
          <Card title="Como se calcula el monto">
            <p className="text-sm text-zinc-600">
              Full/Part time: base mensual del mes + <span className="font-medium">bonos</span> del periodo. Por horas:{" "}
              <span className="font-medium">tarifa</span> x <span className="font-medium">horas del mes</span> + bonos.
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              La tabla muestra 10 filas por pagina ordenadas por monto a pagar (mayor a menor). Las casillas de seleccion
              aplican solo a la pagina visible.
            </p>
          </Card>
        </div>

        <Table>
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Seleccion</th>
                <th className="px-4 py-3 font-medium">Empleado</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Pago</th>
                <th className="px-4 py-3 font-medium">Base</th>
                <th className="px-4 py-3 font-medium">Bonos</th>
                <th className="px-4 py-3 font-medium">Horas mes</th>
                <th className="px-4 py-3 font-medium">Monto a pagar</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.employeeId} className="border-t border-zinc-200">
                  <td className="px-4 py-3">
                    {row.alreadyRegistered ? (
                      <span className="text-xs font-medium text-emerald-700">-</span>
                    ) : (
                      <input
                        type="checkbox"
                        name="selected_employee_id"
                        value={row.employeeId}
                        className="h-4 w-4"
                        form="register-payments-form"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{row.fullName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="info">{typeLabel[row.employeeType] ?? row.employeeType}</Badge>
                  </td>
                  <td className="px-4 py-3">{paymentLabel[row.paymentMethod] ?? row.paymentMethod}</td>
                  <td className="px-4 py-3">{formatCurrency(row.baseAmount, row.currency)}</td>
                  <td className="px-4 py-3">
                    {row.bonusTotal > 0 ? (
                      <span className="font-medium text-lm-dark-teal">{formatCurrency(row.bonusTotal, row.currency)}</span>
                    ) : (
                      <span className="text-zinc-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.employeeType === "hourly" ? (
                      <form action={upsertMonthlyHoursAction} className="flex items-center gap-2">
                        <input type="hidden" name="employee_id" value={row.employeeId} />
                        <input type="hidden" name="period_month" value={month} />
                        <input type="hidden" name="ret_qs" value={retQs} />
                        <Input
                          name="hours_worked"
                          type="number"
                          step="0.5"
                          min="0"
                          defaultValue={row.monthHours}
                          className="h-8 w-24"
                        />
                        <Button type="submit" className="h-8 px-3 text-xs">
                          Guardar
                        </Button>
                      </form>
                    ) : (
                      <span className="text-zinc-500">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-lm-dark-teal">
                    {formatCurrency(row.amountToPay, row.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {row.alreadyRegistered ? (
                      <Badge variant="success">Pagado</Badge>
                    ) : (
                      <Badge variant="warning">Pendiente</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationBar pathname="/reports" query={listQuery} page={safePage} pageSize={pageSize} total={total} />
        </Table>
        <form id="register-payments-form" action={registerMonthlyPaymentsAction} className="mt-3 space-y-2">
          <input type="hidden" name="period_month" value={month} />
          <input type="hidden" name="ret_qs" value={retQs} />
          <Button type="submit">Registrar pagos seleccionados</Button>
        </form>
      </div>
    </div>
  );
}
