import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, Notice } from "@/components/ui/card";
import { getCountryOptionsEs } from "@/lib/countries";
import { bankAccountTypeLabel, employeeTypeLabel, employmentStatusLabel, paymentMethodLabel } from "@/lib/employee-display";
import { formatCurrency, formatDate, formatDateOnlyLocal } from "@/lib/utils";
import { getMonthlyBonusesForEmployee } from "@/services/bonuses.service";
import { setEmployeeLoansAccessAction } from "@/app/(backoffice)/employees/actions";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { canViewEmployeeRecord, getCurrentEmployee, getCurrentUserRole, getEmployeeById, isLoansEnabledForEmail } from "@/services/employees.service";

interface EmployeeProfilePageProps {
  params: {
    id: string;
  };
  searchParams?: {
    saved?: string;
    error?: string;
  };
}

function countryLabel(code: string | null | undefined): string {
  if (!code) return "-";
  const opts = getCountryOptionsEs();
  return opts.find((o) => o.value === code)?.label ?? code;
}

export default async function EmployeeProfilePage({ params, searchParams }: EmployeeProfilePageProps) {
  const [role, currentEmployee, employee] = await Promise.all([
    getCurrentUserRole(),
    getCurrentEmployee(),
    getEmployeeById(params.id),
  ]);

  if (!employee) notFound();

  const canView = await canViewEmployeeRecord(role, currentEmployee?.id, employee.id);

  if (!canView) {
    redirect("/employees");
  }

  const recentBonuses = await getMonthlyBonusesForEmployee(employee.id);
  const previewBonuses = recentBonuses.slice(0, 5);

  const isAdmin = role === "admin";
  const manager = employee.manager_id ? await getEmployeeById(employee.manager_id) : null;
  const loansEnabled = isAdmin ? await isLoansEnabledForEmail(employee.email) : false;
  const adminSupabase = createSupabaseAdminClient();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const periodDate = `${currentMonth}-01`;

  const [{ data: monthlyHours }, { data: acks }, { data: latestPayment }] = await Promise.all([
    adminSupabase
      .from("employee_monthly_hours")
      .select("hours_worked")
      .eq("employee_id", employee.id)
      .eq("period_month", periodDate)
      .maybeSingle(),
    adminSupabase
      .from("document_acknowledgements")
      .select("document_id,acknowledged_at")
      .eq("employee_id", employee.id),
    adminSupabase
      .from("employee_payments")
      .select("amount_paid,currency,period_month")
      .eq("employee_id", employee.id)
      .order("period_month", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const ackMap = new Map((acks ?? []).map((a) => [a.document_id, a.acknowledged_at]));
  const ackDocIds = Array.from(ackMap.keys());
  const { data: signedDocs } = ackDocIds.length
    ? await adminSupabase
        .from("documents")
        .select("id,title,category,created_at")
        .in("id", ackDocIds)
        .order("created_at", { ascending: false })
    : { data: [] as Array<{ id: string; title: string; category: string; created_at: string }> };

  const hoursWorked = Number(monthlyHours?.hours_worked ?? 0);
  const monthlyProjectedPay =
    employee.employee_type === "hourly"
      ? Number(employee.current_salary_amount ?? 0) * hoursWorked
      : Number(employee.current_salary_amount ?? 0);

  return (
    <div>
      <Topbar title={`Perfil 360: ${employee.full_name}`} subtitle="Resumen integral del colaborador para gestion de personal." />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Datos personales">
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium text-zinc-700">Codigo:</span> {employee.employee_code}
              </p>
              <p>
                <span className="font-medium text-zinc-700">Nombre:</span> {employee.first_name ?? "-"}
              </p>
              <p>
                <span className="font-medium text-zinc-700">Apellido:</span> {employee.last_name ?? "-"}
              </p>
              <p>
                <span className="font-medium text-zinc-700">Email:</span> {employee.email}
              </p>
              <p>
                <span className="font-medium text-zinc-700">Teléfono:</span>{" "}
                {[employee.phone_prefix, employee.phone].filter(Boolean).join(" ") || "-"}
              </p>
              <p>
                <span className="font-medium text-zinc-700">WhatsApp:</span>{" "}
                {[employee.whatsapp_prefix, employee.whatsapp_number].filter(Boolean).join(" ") || "-"}
              </p>
              <p>
                <span className="font-medium text-zinc-700">Nacionalidad:</span> {countryLabel(employee.nationality)}
              </p>
              <p>
                <span className="font-medium text-zinc-700">Residencia:</span> {countryLabel(employee.residence_country)}
              </p>
              {employee.legal_name_bank ? (
                <p>
                  <span className="font-medium text-zinc-700">Nombre (banco/ID):</span> {employee.legal_name_bank}
                </p>
              ) : null}
              {employee.identity_document ? (
                <p>
                  <span className="font-medium text-zinc-700">Documento:</span> {employee.identity_document}
                </p>
              ) : null}
              {employee.address_line ? (
                <p>
                  <span className="font-medium text-zinc-700">Direccion:</span> {employee.address_line}
                </p>
              ) : null}
              {(employee.address_city || employee.address_postal_code || employee.address_country) && (
                <p>
                  <span className="font-medium text-zinc-700">Ciudad / CP / Pais:</span>{" "}
                  {[employee.address_city, employee.address_postal_code, countryLabel(employee.address_country)]
                    .filter(Boolean)
                    .join(", ") || "-"}
                </p>
              )}
            </div>
          </Card>

          <Card title="Datos laborales">
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium text-zinc-700">Manager:</span> {manager?.full_name ?? "Sin manager"}
              </p>
              <p>
                <span className="font-medium text-zinc-700">Departamento:</span> {employee.department}
              </p>
              <p>
                <span className="font-medium text-zinc-700">Cargo:</span> {employee.job_title}
              </p>
              <p>
                <span className="font-medium text-zinc-700">Tipo de usuario:</span>{" "}
                {employeeTypeLabel[employee.employee_type] ?? employee.employee_type}
              </p>
              <p>
                <span className="font-medium text-zinc-700">Fecha de contratacion:</span> {employee.hire_date}
              </p>
              <p>
                <span className="font-medium text-zinc-700">Estado:</span>{" "}
                <Badge variant={employee.employment_status === "active" ? "success" : "warning"}>
                  {employmentStatusLabel[employee.employment_status] ?? employee.employment_status}
                </Badge>
              </p>
              {employee.employee_type === "hourly" ? null : (
                <p>
                  <span className="font-medium text-zinc-700">Días de vacaciones:</span> {employee.vacation_days_per_year}
                </p>
              )}
            </div>
          </Card>

          <Card title="Datos de pago">
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium text-zinc-700">Metodo:</span>{" "}
                {employee.payment_method ? paymentMethodLabel[employee.payment_method] ?? employee.payment_method : "Sin indicar"}
              </p>
              <p>
                <span className="font-medium text-zinc-700">Cuenta destino:</span> {employee.payment_account ?? "-"}
              </p>
              {employee.invoice_currency ? (
                <p>
                  <span className="font-medium text-zinc-700">Moneda facturas:</span> {employee.invoice_currency}
                </p>
              ) : null}
              {employee.paypal_email ? (
                <p>
                  <span className="font-medium text-zinc-700">PayPal:</span> {employee.paypal_email}
                </p>
              ) : null}
              {employee.payment_method === "bank" &&
              (employee.bank_name || employee.bank_account_number || employee.swift_bic || employee.bank_route_number) ? (
                <>
                  {employee.bank_name ? (
                    <p>
                      <span className="font-medium text-zinc-700">Banco:</span> {employee.bank_name}
                    </p>
                  ) : null}
                  {employee.bank_account_type ? (
                    <p>
                      <span className="font-medium text-zinc-700">Tipo de cuenta:</span>{" "}
                      {bankAccountTypeLabel[employee.bank_account_type] ?? employee.bank_account_type}
                    </p>
                  ) : null}
                  {employee.bank_account_number ? (
                    <p>
                      <span className="font-medium text-zinc-700">Cuenta:</span> {employee.bank_account_number}
                    </p>
                  ) : null}
                  {employee.swift_bic ? (
                    <p>
                      <span className="font-medium text-zinc-700">SWIFT/BIC:</span> {employee.swift_bic}
                    </p>
                  ) : null}
                  {employee.bank_route_number ? (
                    <p>
                      <span className="font-medium text-zinc-700">Ruta:</span> {employee.bank_route_number}
                    </p>
                  ) : null}
                </>
              ) : null}
              <p>
                <span className="font-medium text-zinc-700">
                  {employee.employee_type === "hourly" ? "Tarifa por hora" : "Salario mensual"}:
                </span>{" "}
                {formatCurrency(employee.current_salary_amount, employee.current_salary_currency)}
              </p>
              {employee.employee_type === "hourly" && Number(employee.current_salary_amount) > 100 ? (
                <p>
                  <Badge variant="warning">Tarifa alta por hora ({formatCurrency(employee.current_salary_amount, employee.current_salary_currency)})</Badge>
                </p>
              ) : null}
              <p>
                <span className="font-medium text-zinc-700">Pago estimado mensual actual:</span>{" "}
                {formatCurrency(monthlyProjectedPay, employee.current_salary_currency)}
              </p>
              {latestPayment ? (
                <p>
                  <span className="font-medium text-zinc-700">Ultimo pago registrado:</span>{" "}
                  {formatCurrency(Number(latestPayment.amount_paid ?? 0), latestPayment.currency)} (
                  {String(latestPayment.period_month).slice(0, 7)})
                </p>
              ) : null}
              {employee.employee_type === "hourly" ? (
                <p>
                  <span className="font-medium text-zinc-700">Horas cargadas ({currentMonth}):</span>{" "}
                  {hoursWorked.toFixed(2)}
                </p>
              ) : null}
            </div>
          </Card>
        </div>

        <Card title="Documentos firmados">
          {signedDocs && signedDocs.length > 0 ? (
            <div className="space-y-2 text-sm">
              {signedDocs.map((doc) => (
                <div key={doc.id} className="rounded-md border border-zinc-200 px-3 py-2">
                  <p className="font-medium text-zinc-900">{doc.title}</p>
                  <p className="text-xs text-zinc-500">
                    {doc.category} - firmado el {formatDate(ackMap.get(doc.id) ?? doc.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No hay documentos firmados todavia.</p>
          )}
        </Card>

        <Card title="Bonos por mes">
          <p className="mb-3 text-sm text-zinc-600">
            Montos extra por periodo de nomina (fecha dentro del mes y concepto). Se suman al pago del mes en{" "}
            <span className="font-medium text-zinc-800">Pagos</span>. Si el mes ya se pagó y se añade un bono, ese importe queda pendiente hasta registrarlo.
          </p>
          {previewBonuses.length > 0 ? (
            <ul className="mb-3 space-y-2 text-sm">
              {previewBonuses.map((b) => (
                <li key={b.id} className="rounded-md border border-zinc-200 px-3 py-2">
                  <span className="font-medium text-zinc-900">{String(b.period_month).slice(0, 7)}</span>
                  <span className="text-zinc-500"> · {formatDateOnlyLocal(b.bonus_date)}</span>
                  <span className="ml-2 font-semibold text-lm-dark-teal">{formatCurrency(b.amount, b.currency)}</span>
                  <p className="mt-1 text-xs text-zinc-600">{b.concept}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-sm text-zinc-500">No hay bonos registrados.</p>
          )}
          <Link
            href={`/employees/${employee.id}/bonuses`}
            className="inline-flex rounded-md border border-lm-aqua/30 bg-lm-sky px-3 py-2 text-sm font-medium text-lm-dark-teal hover:bg-lm-aqua/15"
          >
            {isAdmin ? "Gestionar bonos" : "Ver bonos"}
          </Link>
          <Link
            href={`/employees/${employee.id}/adjustments`}
            className="ml-3 inline-flex rounded-md border border-lm-aqua/30 bg-lm-sky px-3 py-2 text-sm font-medium text-lm-dark-teal hover:bg-lm-aqua/15"
          >
            {isAdmin ? "Incentivos y descuentos" : "Ver incentivos y descuentos"}
          </Link>
        </Card>

        {isAdmin ? (
          <Card title="Prestamos">
            {searchParams?.saved === "loans" ? <Notice tone="success">Se actualizo el acceso a prestamos.</Notice> : null}
            {searchParams?.error ? <Notice tone="error">{searchParams.error}</Notice> : null}
            <form action={setEmployeeLoansAccessAction} className="mt-3 flex items-center gap-3 text-sm text-lm-dark-teal">
              <input type="hidden" name="employee_id" value={employee.id} />
              <label className="flex items-center gap-2">
                <input type="checkbox" name="loans_enabled" defaultChecked={loansEnabled} className="h-4 w-4 accent-lm-dark-teal" />
                Prestamo activo
              </label>
              <ConfirmSubmitButton type="submit" confirmMessage="Confirma que deseas guardar el acceso a prestamos.">
                Guardar
              </ConfirmSubmitButton>
            </form>
          </Card>
        ) : null}

        <Card title="Accesos rapidos">
          <div className="flex flex-wrap gap-3 text-sm">
            {isAdmin ? (
              <Link href={`/employees/${employee.id}/edit`} className="rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50">
                Editar ficha
              </Link>
            ) : null}
            {currentEmployee && employee.id === currentEmployee.id && role !== "admin" ? (
              <Link href="/employee-portal/datos" className="rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50">
                Editar mis datos
              </Link>
            ) : null}
            <Link href={`/employees/${employee.id}/salary`} className="rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50">
              Historial salarial
            </Link>
            <Link href={`/employees/${employee.id}/job`} className="rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50">
              Historial cargo/depto
            </Link>
            {employee.employee_type === "hourly" && (isAdmin || role === "manager" || currentEmployee?.id === employee.id) ? (
              <Link href={`/employees/${employee.id}/time`} className="rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50">
                Bolsa de horas
              </Link>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
