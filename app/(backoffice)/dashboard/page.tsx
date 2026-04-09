import Link from "next/link";

import { MonthlyPayrollByTypeChart } from "@/components/dashboard/monthly-payroll-by-type-chart";
import { PendingApprovalsTracker } from "@/components/dashboard/pending-approvals-tracker";
import { DashboardRecentHires } from "@/components/dashboard/dashboard-recent-hires";
import { DashboardSectionTitle } from "@/components/dashboard/dashboard-section-title";
import { PublicHolidaysSpainCard } from "@/components/dashboard/public-holidays-spain-card";
import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome";
import { Topbar } from "@/components/layout/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoginNotificationsModal } from "@/components/dashboard/login-notifications-modal";
import { TimeClockCard } from "@/components/employee-portal/time-clock-card";
import { acknowledgeDocumentAction } from "@/app/(backoffice)/documents/actions";
import {
  formatYearMonthLabel,
  resolveDashboardPayMonth,
  shiftYearMonth,
} from "@/lib/payment-tracker-month";
import { formatCurrency } from "@/lib/utils";
import { getUpcomingSpainNationalHolidays } from "@/lib/spain-national-holidays";
import { getDashboardKpis } from "@/services/dashboard.service";
import {
  getPendingDocumentConfirmationsForAdmin,
  getPendingVacationApprovalsForAdmin,
  type PendingDocConfirmationRow,
  type PendingVacationApprovalRow,
} from "@/services/dashboard-tracker.service";
import { getLastPunchEvent, isShiftOpenFromLastEvent } from "@/services/attendance.service";
import { getCurrentEmployee, getCurrentUserRole, getEmployeesPaged } from "@/services/employees.service";
import { getLoginNotifications } from "@/services/notifications.service";
import {
  getMonthlyPaidByEmployeeTypeSeries,
  getPendingPayrollTrackerSummary,
  type MonthlyPaidByTypeDatum,
  type PendingPayrollTrackerSummary,
} from "@/services/payments.service";

function payrollTrackerLabels(summary: PendingPayrollTrackerSummary) {
  const { pendingAmountByCurrency, pendingCount } = summary;
  const entries = Object.entries(pendingAmountByCurrency).filter(([, v]) => v > 0);
  if (entries.length === 0) {
    return {
      headline: formatCurrency(0, "USD"),
      sub: `USD · ${pendingCount} colaboradores`,
    };
  }
  if (entries.length === 1) {
    const [c, a] = entries[0]!;
    return {
      headline: formatCurrency(a, c),
      sub: `${c} · ${pendingCount} colaboradores`,
    };
  }
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  return {
    headline: "Varias monedas",
    sub: `${sorted.map(([c, a]) => `${c} ${formatCurrency(a, c)}`).join(" · ")} · ${pendingCount} colaboradores`,
  };
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

const TRACKER_CARD_MIN = "min-h-[340px]";

interface DashboardPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const payMonth = resolveDashboardPayMonth(firstSearchParam(searchParams?.pay_month));
  const prevPayMonth = shiftYearMonth(payMonth, -1);
  const nextPayMonth = shiftYearMonth(payMonth, 1);
  const monthLabel = formatYearMonthLabel(payMonth);

  const [kpis, role, notifications, recentIngresos, currentEmp] = await Promise.all([
    getDashboardKpis(),
    getCurrentUserRole(),
    getLoginNotifications(),
    getEmployeesPaged({ page: 1, pageSize: 5 }),
    getCurrentEmployee(),
  ]);
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isEmployee = role === "employee";

  const showPunchOnDashboard =
    Boolean(currentEmp) &&
    currentEmp!.employee_type === "hourly" &&
    (currentEmp!.hourly_hours_source ?? "manual_monthly") === "punch";

  const lastPunchForDashboard =
    showPunchOnDashboard && currentEmp ? await getLastPunchEvent(currentEmp.id) : null;
  const shiftOpenDashboard = showPunchOnDashboard
    ? isShiftOpenFromLastEvent(lastPunchForDashboard)
    : false;

  const topbarSubtitle = isAdmin
    ? "Vista operativa de recursos humanos para back office."
    : isManager
      ? "Resumen de tu equipo y alertas clave."
      : "Tu resumen personal y avisos importantes.";

  const welcomeFirst =
    currentEmp?.full_name?.split(/\s+/).find((p) => p.length > 0) ?? null;

  let payrollSummary: PendingPayrollTrackerSummary | null = null;
  let pendingDocs: PendingDocConfirmationRow[] = [];
  let pendingVacations: PendingVacationApprovalRow[] = [];
  let payrollByTypeSeries: MonthlyPaidByTypeDatum[] = [];

  if (isAdmin) {
    const [ps, d, v, series] = await Promise.all([
      getPendingPayrollTrackerSummary(payMonth).catch(() => null),
      getPendingDocumentConfirmationsForAdmin(3),
      getPendingVacationApprovalsForAdmin(3),
      getMonthlyPaidByEmployeeTypeSeries(12).catch(() => [] as MonthlyPaidByTypeDatum[]),
    ]);
    payrollSummary = ps;
    pendingDocs = d;
    pendingVacations = v;
    payrollByTypeSeries = series;
  }

  const showPayrollChart = isAdmin && payrollByTypeSeries.length > 0;
  const trackerText = payrollSummary ? payrollTrackerLabels(payrollSummary) : null;

  const livesInSpain = currentEmp?.residence_country?.toUpperCase() === "ES";
  const showSpainPublicHolidays = isAdmin || (isManager && livesInSpain);
  const spainHolidayPreview = showSpainPublicHolidays ? getUpcomingSpainNationalHolidays(new Date(), 5) : [];

  return (
    <div>
      {!isAdmin ? (
        <LoginNotificationsModal
          pendingDocuments={notifications.pendingDocuments}
          approvedVacations={notifications.approvedVacations}
          acknowledgeAction={acknowledgeDocumentAction}
        />
      ) : null}
      <Topbar title="Dashboard HRIS" subtitle={topbarSubtitle} />
      <div className="space-y-8 p-6">
        {showPunchOnDashboard && currentEmp ? (
          <section className="space-y-2" aria-label="Fichaje de entrada y salida">
            <TimeClockCard shiftOpen={shiftOpenDashboard} />
            <p className="text-center text-xs text-zinc-500">
              <Link href={`/employees/${currentEmp.id}/time`} className="text-lm-dark-teal underline">
                Ver historial de fichajes
              </Link>
              {" · "}
              <Link href="/employee-portal" className="text-lm-dark-teal underline">
                Ir al portal del empleado
              </Link>
            </p>
          </section>
        ) : null}

        <DashboardWelcome
          firstName={welcomeFirst}
          fullName={currentEmp?.full_name ?? null}
          role={role}
        />

        <section
          className={`grid gap-4 ${
            isAdmin
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}
          aria-label="Indicadores clave"
        >
          {isAdmin ? (
            <>
              <KpiCard label="Total empleados" value={String(kpis.totalEmployees)} emphasized />
              <KpiCard label="Empleados activos" value={String(kpis.activeEmployees)} />
              <KpiCard label="Prestamos activos" value={String(kpis.openLoans)} />
              <KpiCard label="Vacaciones pendientes" value={String(kpis.pendingVacationRequests)} />
              <KpiCard
                label="Nomina mensual estimada"
                value={formatCurrency(kpis.monthlyPayrollEstimate)}
                helper="Estimacion sobre plantilla activa"
              />
            </>
          ) : null}
          {isManager ? (
            <>
              <KpiCard label="Empleados a cargo" value={String(kpis.totalEmployees)} emphasized />
              <KpiCard label="Prestamos activos" value={String(kpis.openLoans)} />
              <KpiCard
                label="Vacaciones pendientes"
                value={String(kpis.pendingVacationRequests)}
                helper="Solicitudes en tu ambito"
              />
            </>
          ) : null}
          {isEmployee ? (
            <>
              <KpiCard label="Tu espacio HRIS" value="Activo" emphasized helper="Ficha y datos personales" />
              <KpiCard label="Prestamos activos" value={String(kpis.openLoans)} />
              <KpiCard
                label="Vacaciones pendientes"
                value={String(kpis.pendingVacationRequests)}
                helper="Tus solicitudes en curso"
              />
            </>
          ) : null}
        </section>

        {isAdmin ? (
          <section className="space-y-4">
            <DashboardSectionTitle>Pagos y aprobaciones</DashboardSectionTitle>
            <p className="max-w-3xl pl-3.5 text-sm text-zinc-600">
              Seguimiento de nominas pendientes y documentacion o vacaciones que requieren accion.
            </p>
            <div className={`grid gap-6 lg:grid-cols-2 lg:items-stretch`}>
              <Card
                className={`flex !h-full ${TRACKER_CARD_MIN} flex-col overflow-hidden !p-0 !border-zinc-900 ring-zinc-200`}
                bodyClassName="mt-0 flex min-h-0 flex-1 flex-col"
              >
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-50 text-xs font-semibold text-zinc-800"
                        aria-hidden
                      >
                        $
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-zinc-900">Payment tracker</h2>
                        <p className="mt-0.5 text-xs leading-snug text-zinc-500">
                          Por defecto: mes anterior. Solo el ultimo dia del mes en curso se muestran pendientes de ese
                          mes.
                        </p>
                        <p className="mt-2 text-xs font-medium capitalize text-red-600">{monthLabel}</p>
                        <p className="mt-1 text-xs font-medium text-red-600">Pagos pendientes</p>
                        {trackerText ? (
                          <>
                            <p className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">{trackerText.headline}</p>
                            <p className="mt-1 text-xs text-zinc-500">{trackerText.sub}</p>
                            <p className="mt-1 text-[11px] text-zinc-400">
                              Periodo {payrollSummary?.periodMonth ?? "—"} · Sin registrar en nomina del mes
                            </p>
                          </>
                        ) : (
                          <p className="mt-2 text-sm text-zinc-500">No se pudo cargar el resumen de pagos.</p>
                        )}
                      </div>
                    </div>
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700"
                      aria-hidden
                    >
                      !
                    </span>
                  </div>
                </div>
                <div className="mt-auto flex flex-col gap-2 border-t border-zinc-200 p-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard?pay_month=${prevPayMonth}`}>
                      <Button type="button" variant="secondary" className="min-h-10 px-3 text-xs">
                        Mes anterior
                      </Button>
                    </Link>
                    <Link href={`/dashboard?pay_month=${nextPayMonth}`}>
                      <Button type="button" variant="secondary" className="min-h-10 px-3 text-xs">
                        Mes siguiente
                      </Button>
                    </Link>
                  </div>
                  <Link
                    href={
                      payrollSummary ? `/reports?month=${payrollSummary.periodMonth}` : `/reports?month=${payMonth}`
                    }
                  >
                    <Button variant="secondary" className="min-h-10 w-full text-xs sm:w-auto">
                      Ir al portal de pagos
                    </Button>
                  </Link>
                </div>
              </Card>

              <PendingApprovalsTracker documents={pendingDocs} vacations={pendingVacations} />
            </div>
          </section>
        ) : null}

        <section className={`grid gap-6 ${showPayrollChart ? "lg:grid-cols-3" : ""}`}>
          <DashboardRecentHires
            employees={recentIngresos.employees}
            totalInScope={recentIngresos.total}
            role={role}
            isAdmin={isAdmin}
            showPayrollChart={showPayrollChart}
          />

          {showPayrollChart ? (
            <div className="lg:col-span-2">
              <DashboardSectionTitle className="mb-4">Evolucion de pagos</DashboardSectionTitle>
              <p className="mb-4 max-w-3xl pl-3.5 text-sm text-zinc-600">
                Ultimos 12 meses de pagos registrados, por tipo de colaborador.
              </p>
              <MonthlyPayrollByTypeChart data={payrollByTypeSeries} />
            </div>
          ) : null}
        </section>

        {showSpainPublicHolidays && spainHolidayPreview.length > 0 ? (
          <section aria-label="Festivos públicos España">
            <PublicHolidaysSpainCard preview={spainHolidayPreview} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
