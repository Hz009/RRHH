import { periodMonthUtcRange, sumWorkedHoursFromPunchEvents } from "@/lib/attendance-hours";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentEmployee, getCurrentUserRole, getEmployees } from "@/services/employees.service";

export interface PaymentPreviewRow {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  employeeType: "full_time" | "part_time" | "hourly";
  paymentMethod: "bank" | "paypal" | "wise";
  paymentAccount: string | null;
  baseAmount: number;
  bonusTotal: number;
  monthHours: number;
  amountToPay: number;
  currency: string;
  alreadyRegistered: boolean;
  paymentRecordId: string | null;
}

export interface PaymentHistoryRow {
  id: string;
  periodMonth: string;
  amountPaid: number;
  currency: string;
  paymentMethod: "bank" | "paypal" | "wise";
  paymentAccount: string | null;
  employeeType: "full_time" | "part_time" | "hourly";
  hoursWorked: number;
  baseAmount: number;
  paidAt: string;
}

export interface PaymentHistoryBonusLine {
  id: string;
  concept: string;
  amount: number;
  currency: string;
  bonusDate: string;
}

export interface MyPaymentHistoryRow extends PaymentHistoryRow {
  bonusLines: PaymentHistoryBonusLine[];
  /** Sueldo/tarifa x horas del periodo (sin bonos). */
  salaryPortion: number;
  /** Suma de bonos en la misma moneda del pago. */
  bonusTotalInPayCurrency: number;
}

export interface PayrollBonusExportLine {
  employeeCode: string;
  fullName: string;
  bonusDate: string;
  amount: number;
  currency: string;
  concept: string;
}

interface CompensationTerm {
  employee_type: "full_time" | "part_time" | "hourly";
  payment_method: "bank" | "paypal" | "wise";
  payment_account: string | null;
  amount: number;
  currency: string;
}

type CompHistoryRow = {
  employee_id: string;
  effective_date: string;
  employee_type: "full_time" | "part_time" | "hourly" | null;
  payment_method: "bank" | "paypal" | "wise" | null;
  payment_account: string | null;
  amount: number | null;
  currency: string | null;
  created_at: string | null;
};

/** Latest compensation row for this employee within the fetched set (must be pre-filtered by period end). */
function pickLatestCompensationForEmployee(rows: CompHistoryRow[], employeeId: string): CompHistoryRow | undefined {
  const forEmp = rows.filter((r) => r.employee_id === employeeId);
  if (!forEmp.length) return undefined;
  forEmp.sort((a, b) => {
    const byDate = String(b.effective_date).localeCompare(String(a.effective_date));
    if (byDate !== 0) return byDate;
    return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
  });
  return forEmp[0];
}

function toPeriodDate(periodMonth: string): string {
  const month = String(periodMonth ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("Mes invalido. Usa formato YYYY-MM.");
  }
  return `${month}-01`;
}

export function getCurrentMonthParam() {
  return new Date().toISOString().slice(0, 7);
}

export type PayrollChartEmployeeType = "full_time" | "part_time" | "hourly";

/** Totales pagados por mes y tipo; por moneda dentro de cada tipo (para barras apiladas). */
export type MonthlyPaidByTypeDatum = {
  periodMonth: string;
  byType: Record<PayrollChartEmployeeType, Record<string, number>>;
};

function lastNCalendarMonths(n: number): string[] {
  const out: string[] = [];
  const anchor = new Date();
  anchor.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function emptyByType(): Record<PayrollChartEmployeeType, Record<string, number>> {
  return { full_time: {}, part_time: {}, hourly: {} };
}

/**
 * Serie mensual de pagos ya registrados en `employee_payments`, agrupados por tipo de empleado y moneda.
 * Rellena los ultimos `monthsBack` meses calendario (con ceros si no hay datos).
 */
export async function getMonthlyPaidByEmployeeTypeSeries(monthsBack = 12): Promise<MonthlyPaidByTypeDatum[]> {
  const role = await getCurrentUserRole();
  if (role !== "admin") return [];

  const monthKeys = lastNCalendarMonths(monthsBack);
  if (!isSupabaseConfigured()) {
    return monthKeys.map((periodMonth) => ({ periodMonth, byType: emptyByType() }));
  }

  const startMonth = monthKeys[0];
  if (!startMonth) return [];

  const adminSupabase = createSupabaseAdminClient();
  const { data, error } = await adminSupabase
    .from("employee_payments")
    .select("period_month,employee_type,amount_paid,currency")
    .gte("period_month", `${startMonth}-01`)
    .order("period_month", { ascending: true });

  if (error) throw new Error(`Error cargando pagos para grafico: ${error.message}`);

  const byMonth = new Map<string, ReturnType<typeof emptyByType>>();
  for (const m of monthKeys) {
    byMonth.set(m, emptyByType());
  }

  for (const row of data ?? []) {
    const ym = String(row.period_month).slice(0, 7);
    if (!byMonth.has(ym)) continue;
    const t = row.employee_type as PayrollChartEmployeeType;
    if (t !== "full_time" && t !== "part_time" && t !== "hourly") continue;
    const cur = String(row.currency || "USD");
    const amt = Number(row.amount_paid ?? 0);
    const cell = byMonth.get(ym)!;
    cell[t][cur] = (cell[t][cur] ?? 0) + amt;
  }

  return monthKeys.map((periodMonth) => ({
    periodMonth,
    byType: byMonth.get(periodMonth)!,
  }));
}

export async function getMonthlyHoursMap(periodMonth: string) {
  const map: Record<string, number> = {};
  if (!isSupabaseConfigured()) return map;

  const adminSupabase = createSupabaseAdminClient();
  const periodDate = toPeriodDate(periodMonth);
  const { startIso, endIso } = periodMonthUtcRange(periodDate);

  const { data: monthlyRows, error: monthlyErr } = await adminSupabase
    .from("employee_monthly_hours")
    .select("employee_id,hours_worked")
    .eq("period_month", periodDate);

  if (monthlyErr) throw new Error(`Error loading monthly hours: ${monthlyErr.message}`);
  for (const row of monthlyRows ?? []) {
    map[row.employee_id] = Number(row.hours_worked ?? 0);
  }

  const { data: hourlyEmps, error: heErr } = await adminSupabase
    .from("employees")
    .select("id,hourly_hours_source")
    .eq("employee_type", "hourly");

  if (heErr) throw new Error(`Error loading hourly employees: ${heErr.message}`);

  const punchIds = (hourlyEmps ?? [])
    .filter((e) => (e.hourly_hours_source ?? "manual_monthly") === "punch")
    .map((e) => e.id);

  if (punchIds.length === 0) return map;

  const { data: punchEvents, error: attErr } = await adminSupabase
    .from("attendance_records")
    .select("employee_id,event_type,occurred_at")
    .in("employee_id", punchIds)
    .in("event_type", ["clock_in", "clock_out"])
    .gte("occurred_at", startIso)
    .lte("occurred_at", endIso)
    .order("occurred_at", { ascending: true });

  if (attErr) throw new Error(`Error loading fichajes: ${attErr.message}`);

  const byEmp: Record<string, { event_type: string; occurred_at: string }[]> = {};
  for (const ev of punchEvents ?? []) {
    const id = ev.employee_id;
    if (!byEmp[id]) byEmp[id] = [];
    byEmp[id].push({ event_type: ev.event_type, occurred_at: ev.occurred_at });
  }
  for (const id of punchIds) {
    map[id] = sumWorkedHoursFromPunchEvents(byEmp[id] ?? []);
  }
  return map;
}

export async function upsertMonthlyHours(input: Record<string, unknown>) {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    throw new Error("Solo admin puede registrar horas mensuales.");
  }

  if (!isSupabaseConfigured()) return;

  const employeeId = String(input.employee_id ?? "");
  const periodMonth = String(input.period_month ?? "");
  const hoursWorked = Number(input.hours_worked ?? 0);

  if (!employeeId || !periodMonth || Number.isNaN(hoursWorked) || hoursWorked < 0) {
    throw new Error("Datos invalidos para registrar horas.");
  }

  const adminSupabase = createSupabaseAdminClient();
  const periodDate = toPeriodDate(periodMonth);

  const { error } = await adminSupabase.from("employee_monthly_hours").upsert(
    {
      employee_id: employeeId,
      period_month: periodDate,
      hours_worked: hoursWorked,
    },
    { onConflict: "employee_id,period_month" }
  );

  if (error) throw new Error(`Error saving monthly hours: ${error.message}`);
}

export async function getPaymentPreview(periodMonth: string): Promise<PaymentPreviewRow[]> {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    throw new Error("Solo admin puede ver el portal de pagos.");
  }

  if (!isSupabaseConfigured()) return [];

  const adminSupabase = createSupabaseAdminClient();
  const employees = await getEmployees({ status: "active" });
  const hoursMap = await getMonthlyHoursMap(periodMonth);
  const periodDate = toPeriodDate(periodMonth);
  const periodEnd = new Date(`${periodDate}T12:00:00`);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  periodEnd.setDate(0);
  const periodEndStr = periodEnd.toISOString().slice(0, 10);

  const eligibleEmployees = employees.filter((employee) => employee.hire_date <= periodEndStr);
  const employeeIds = eligibleEmployees.map((employee) => employee.id);

  const [{ data: compHistory }, { data: existingPayments }, { data: bonusRows }] = await Promise.all([
    adminSupabase
      .from("employee_compensation_history")
      .select("employee_id,effective_date,employee_type,payment_method,payment_account,amount,currency,created_at")
      .in("employee_id", employeeIds)
      .lte("effective_date", periodEndStr)
      .order("effective_date", { ascending: false })
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("employee_payments")
      .select(
        "id,employee_id,amount_paid,currency,payment_method,payment_account,employee_type,hours_worked,base_amount"
      )
      .eq("period_month", periodDate),
    adminSupabase
      .from("employee_monthly_bonuses")
      .select("employee_id,amount,currency")
      .eq("period_month", periodDate)
      .in("employee_id", employeeIds),
  ]);

  const rows = (compHistory ?? []) as CompHistoryRow[];
  const compensationByEmployee: Record<string, CompensationTerm> = {};
  for (const employee of eligibleEmployees) {
    const row = pickLatestCompensationForEmployee(rows, employee.id);
    if (row) {
      compensationByEmployee[employee.id] = {
        employee_type: row.employee_type ?? "full_time",
        payment_method: row.payment_method ?? "bank",
        payment_account: row.payment_account,
        amount: Number(row.amount ?? 0),
        currency: row.currency ?? "USD",
      };
    }
  }

  const paymentMap = new Map(
    (existingPayments ?? []).map((row) => [row.employee_id, row])
  );

  const bonusesByEmployee = new Map<string, Array<{ amount: number; currency: string }>>();
  for (const row of bonusRows ?? []) {
    const list = bonusesByEmployee.get(row.employee_id) ?? [];
    list.push({ amount: Number(row.amount ?? 0), currency: String(row.currency ?? "USD") });
    bonusesByEmployee.set(row.employee_id, list);
  }

  return eligibleEmployees.map((employee) => {
    const term = compensationByEmployee[employee.id];
    const employeeType = term?.employee_type ?? employee.employee_type ?? "full_time";
    const monthHours = Number(hoursMap[employee.id] ?? 0);
    const baseAmount = Number(term?.amount ?? employee.current_salary_amount ?? 0);
    const basePay = employeeType === "hourly" ? baseAmount * monthHours : baseAmount;
    const paymentRecord = paymentMap.get(employee.id) ?? null;
    const isRegistered = Boolean(paymentRecord?.id);
    const currency = isRegistered
      ? paymentRecord?.currency ?? "USD"
      : term?.currency ?? employee.current_salary_currency ?? "USD";
    const bonusList = bonusesByEmployee.get(employee.id) ?? [];
    const bonusTotal = bonusList
      .filter((b) => b.currency === currency)
      .reduce((sum, b) => sum + b.amount, 0);
    const amountToPayPending = basePay + bonusTotal;

    return {
      employeeId: employee.id,
      employeeCode: employee.employee_code,
      fullName: employee.full_name,
      employeeType: isRegistered
        ? paymentRecord?.employee_type ?? employeeType
        : employeeType,
      paymentMethod: isRegistered
        ? paymentRecord?.payment_method ?? "bank"
        : term?.payment_method ?? employee.payment_method ?? "bank",
      paymentAccount: isRegistered
        ? paymentRecord?.payment_account ?? null
        : term?.payment_account ?? employee.payment_account,
      baseAmount: isRegistered
        ? Number(paymentRecord?.base_amount ?? 0)
        : baseAmount,
      bonusTotal,
      monthHours: isRegistered
        ? Number(paymentRecord?.hours_worked ?? 0)
        : monthHours,
      amountToPay: isRegistered
        ? Number(paymentRecord?.amount_paid ?? 0)
        : amountToPayPending,
      currency,
      alreadyRegistered: isRegistered,
      paymentRecordId: paymentRecord?.id ?? null,
    };
  });
}

export interface PendingPayrollTrackerSummary {
  periodMonth: string;
  pendingCount: number;
  pendingAmountByCurrency: Record<string, number>;
}

export async function getPendingPayrollTrackerSummary(periodMonth?: string): Promise<PendingPayrollTrackerSummary> {
  const month = String(periodMonth ?? "").trim() || getCurrentMonthParam();
  const rows = await getPaymentPreview(month);
  const pending = rows.filter((r) => !r.alreadyRegistered);
  const pendingAmountByCurrency: Record<string, number> = {};
  for (const r of pending) {
    const c = r.currency || "USD";
    pendingAmountByCurrency[c] = (pendingAmountByCurrency[c] ?? 0) + r.amountToPay;
  }
  return { periodMonth: month, pendingCount: pending.length, pendingAmountByCurrency };
}

export type PaymentReportsListFilters = {
  employeeId?: string;
  employeeType?: string;
  status?: "all" | "pending" | "paid";
  paymentMethod?: string;
};

export const PAYMENT_REPORTS_PAGE_SIZE = 10;

export function filterSortPaginatePaymentPreviewRows(
  rows: PaymentPreviewRow[],
  filters: PaymentReportsListFilters,
  page: number
): {
  pageRows: PaymentPreviewRow[];
  total: number;
  page: number;
  pageSize: number;
  filteredAmountByCurrency: Record<string, number>;
} {
  let r = [...rows];
  if (filters.employeeId) r = r.filter((x) => x.employeeId === filters.employeeId);
  if (filters.employeeType && filters.employeeType !== "all") {
    r = r.filter((x) => x.employeeType === filters.employeeType);
  }
  if (filters.status === "pending") r = r.filter((x) => !x.alreadyRegistered);
  if (filters.status === "paid") r = r.filter((x) => x.alreadyRegistered);
  if (filters.paymentMethod && filters.paymentMethod !== "all") {
    r = r.filter((x) => x.paymentMethod === filters.paymentMethod);
  }
  r.sort((a, b) => b.amountToPay - a.amountToPay);
  const filteredAmountByCurrency: Record<string, number> = {};
  for (const row of r) {
    const c = row.currency || "USD";
    filteredAmountByCurrency[c] = (filteredAmountByCurrency[c] ?? 0) + row.amountToPay;
  }
  const total = r.length;
  const p = Math.max(1, page);
  const pageSize = PAYMENT_REPORTS_PAGE_SIZE;
  const from = (p - 1) * pageSize;
  const pageRows = r.slice(from, from + pageSize);
  return { pageRows, total, page: p, pageSize, filteredAmountByCurrency };
}

export async function registerMonthlyPayments(periodMonth: string, selectedEmployeeIds: string[]) {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    throw new Error("Solo admin puede registrar pagos.");
  }

  if (!selectedEmployeeIds.length) {
    throw new Error("Selecciona al menos un empleado para registrar pagos.");
  }

  if (!isSupabaseConfigured()) return;

  const adminSupabase = createSupabaseAdminClient();
  const periodDate = toPeriodDate(periodMonth);
  const rows = await getPaymentPreview(periodMonth);
  const selectedSet = new Set(selectedEmployeeIds);
  const selectedRows = rows.filter((row) => selectedSet.has(row.employeeId) && !row.alreadyRegistered);

  const payload = selectedRows.map((row) => ({
    employee_id: row.employeeId,
    period_month: periodDate,
    amount_paid: row.amountToPay,
    currency: row.currency,
    payment_method: row.paymentMethod,
    payment_account: row.paymentAccount,
    employee_type: row.employeeType,
    hours_worked: row.monthHours,
    base_amount: row.baseAmount,
    paid_at: new Date().toISOString(),
  }));

  if (payload.length === 0) return;

  const { error } = await adminSupabase
    .from("employee_payments")
    .upsert(payload, { onConflict: "employee_id,period_month" });
  if (error) throw new Error(`Error saving employee payments: ${error.message}`);
}

export async function getMyPaymentHistory(): Promise<PaymentHistoryRow[]> {
  if (!isSupabaseConfigured()) return [];

  const currentEmployee = await getCurrentEmployee();
  if (!currentEmployee) return [];

  const adminSupabase = createSupabaseAdminClient();
  const { data, error } = await adminSupabase
    .from("employee_payments")
    .select("*")
    .eq("employee_id", currentEmployee.id)
    .order("period_month", { ascending: false });

  if (error) throw new Error(`Error loading payment history: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    periodMonth: String(row.period_month).slice(0, 7),
    amountPaid: Number(row.amount_paid ?? 0),
    currency: row.currency,
    paymentMethod: row.payment_method ?? "bank",
    paymentAccount: row.payment_account,
    employeeType: row.employee_type ?? "full_time",
    hoursWorked: Number(row.hours_worked ?? 0),
    baseAmount: Number(row.base_amount ?? 0),
    paidAt: row.paid_at ?? row.created_at,
  }));
}

export async function getMyPaymentHistoryDetailed(): Promise<MyPaymentHistoryRow[]> {
  const baseRows = await getMyPaymentHistory();
  if (!baseRows.length || !isSupabaseConfigured()) {
    return baseRows.map((r) => ({
      ...r,
      bonusLines: [],
      salaryPortion:
        r.employeeType === "hourly" ? Number(r.baseAmount ?? 0) * Number(r.hoursWorked ?? 0) : Number(r.baseAmount ?? 0),
      bonusTotalInPayCurrency: 0,
    }));
  }

  const currentEmployee = await getCurrentEmployee();
  if (!currentEmployee) return [];

  const adminSupabase = createSupabaseAdminClient();
  const periodDates = [...new Set(baseRows.map((r) => `${r.periodMonth}-01`))];
  const { data: bonusRows, error } = await adminSupabase
    .from("employee_monthly_bonuses")
    .select("id,period_month,bonus_date,amount,currency,concept")
    .eq("employee_id", currentEmployee.id)
    .in("period_month", periodDates);

  if (error) throw new Error(`Error cargando bonos del historial: ${error.message}`);

  const byPeriod = new Map<string, PaymentHistoryBonusLine[]>();
  for (const b of bonusRows ?? []) {
    const ym = String(b.period_month).slice(0, 7);
    const line: PaymentHistoryBonusLine = {
      id: b.id,
      concept: b.concept,
      amount: Number(b.amount ?? 0),
      currency: String(b.currency ?? "USD"),
      bonusDate: String(b.bonus_date).slice(0, 10),
    };
    const list = byPeriod.get(ym) ?? [];
    list.push(line);
    byPeriod.set(ym, list);
  }

  return baseRows.map((r) => {
    const lines = byPeriod.get(r.periodMonth) ?? [];
    const bonusTotalInPayCurrency = lines
      .filter((l) => l.currency.toUpperCase() === r.currency.toUpperCase())
      .reduce((s, l) => s + l.amount, 0);
    const salaryPortion =
      r.employeeType === "hourly" ? Number(r.baseAmount ?? 0) * Number(r.hoursWorked ?? 0) : Number(r.baseAmount ?? 0);
    return {
      ...r,
      bonusLines: lines,
      salaryPortion,
      bonusTotalInPayCurrency,
    };
  });
}

export async function getPayrollBonusExportLines(periodMonth: string): Promise<PayrollBonusExportLine[]> {
  if (!isSupabaseConfigured()) return [];

  const adminSupabase = createSupabaseAdminClient();
  const periodDate = toPeriodDate(periodMonth);
  const { data: bonuses, error } = await adminSupabase
    .from("employee_monthly_bonuses")
    .select("employee_id,bonus_date,amount,currency,concept")
    .eq("period_month", periodDate);

  if (error) throw new Error(`Error cargando bonos para export: ${error.message}`);
  if (!bonuses?.length) return [];

  const ids = [...new Set(bonuses.map((b) => b.employee_id))];
  const { data: emps, error: empErr } = await adminSupabase
    .from("employees")
    .select("id,employee_code,full_name")
    .in("id", ids);

  if (empErr) throw new Error(`Error cargando empleados: ${empErr.message}`);
  const map = new Map((emps ?? []).map((e) => [e.id, e]));

  return bonuses.map((b) => {
    const emp = map.get(b.employee_id);
    const concept = String(b.concept ?? "").replace(/\|/g, " ").replace(/\r?\n/g, " ");
    return {
      employeeCode: emp?.employee_code ?? "",
      fullName: emp?.full_name ?? "",
      bonusDate: String(b.bonus_date).slice(0, 10),
      amount: Number(b.amount ?? 0),
      currency: String(b.currency ?? "USD"),
      concept,
    };
  });
}

export async function getPaymentHistoryForEmployee(employeeId: string, limit = 24): Promise<PaymentHistoryRow[]> {
  if (!isSupabaseConfigured()) return [];

  const role = await getCurrentUserRole();
  const currentEmployee = role !== "admin" ? await getCurrentEmployee() : null;

  if (role === "employee") {
    if (!currentEmployee || currentEmployee.id !== employeeId) return [];
  }

  if (role === "manager") {
    if (!currentEmployee) return [];
    const visibleEmployees = await getEmployees();
    const canView = visibleEmployees.some((employee) => employee.id === employeeId);
    if (!canView) return [];
  }

  const adminSupabase = createSupabaseAdminClient();
  const { data, error } = await adminSupabase
    .from("employee_payments")
    .select("*")
    .eq("employee_id", employeeId)
    .order("period_month", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Error loading employee payment history: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    periodMonth: String(row.period_month).slice(0, 7),
    amountPaid: Number(row.amount_paid ?? 0),
    currency: row.currency,
    paymentMethod: row.payment_method ?? "bank",
    paymentAccount: row.payment_account,
    employeeType: row.employee_type ?? "full_time",
    hoursWorked: Number(row.hours_worked ?? 0),
    baseAmount: Number(row.base_amount ?? 0),
    paidAt: row.paid_at ?? row.created_at,
  }));
}

export async function getPaymentsHistoryForAdmin(limit = 300): Promise<
  Array<
    PaymentHistoryRow & {
      employeeId: string;
      employeeCode: string;
      employeeName: string;
    }
  >
> {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    throw new Error("Solo admin puede ver historial global de pagos.");
  }
  if (!isSupabaseConfigured()) return [];

  const adminSupabase = createSupabaseAdminClient();
  const [{ data: payments, error: paymentsError }, employees] = await Promise.all([
    adminSupabase
      .from("employee_payments")
      .select("*")
      .order("period_month", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit),
    getEmployees(),
  ]);

  if (paymentsError) throw new Error(`Error loading payments history: ${paymentsError.message}`);
  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  return (payments ?? []).map((row) => {
    const employee = employeeMap.get(row.employee_id);
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeCode: employee?.employee_code ?? "-",
      employeeName: employee?.full_name ?? "Empleado no encontrado",
      periodMonth: String(row.period_month).slice(0, 7),
      amountPaid: Number(row.amount_paid ?? 0),
      currency: row.currency,
      paymentMethod: row.payment_method ?? "bank",
      paymentAccount: row.payment_account,
      employeeType: row.employee_type ?? "full_time",
      hoursWorked: Number(row.hours_worked ?? 0),
      baseAmount: Number(row.base_amount ?? 0),
      paidAt: row.paid_at ?? row.created_at,
    };
  });
}

export function buildPaymentsTxt(
  periodMonth: string,
  rows: PaymentPreviewRow[],
  bonusDetailLines?: PayrollBonusExportLine[]
) {
  const lines: string[] = [];
  lines.push(`PAYROLL_EXPORT|MONTH=${periodMonth}|GENERATED_AT=${new Date().toISOString()}`);
  lines.push(
    "employee_code|employee_name|employee_type|payment_method|payment_account|base_amount|bonus_total|month_hours|amount_to_pay|currency"
  );
  for (const row of rows) {
    lines.push(
      [
        row.employeeCode,
        row.fullName,
        row.employeeType,
        row.paymentMethod,
        row.paymentAccount ?? "",
        row.baseAmount.toFixed(2),
        row.bonusTotal.toFixed(2),
        row.monthHours.toFixed(2),
        row.amountToPay.toFixed(2),
        row.currency,
      ].join("|")
    );
  }

  if (bonusDetailLines?.length) {
    lines.push("");
    lines.push(`BONUS_DETAIL_LINES|MONTH=${periodMonth}`);
    lines.push("employee_code|employee_name|bonus_date|amount|currency|concept");
    for (const b of bonusDetailLines) {
      lines.push(
        [
          b.employeeCode,
          b.fullName,
          b.bonusDate,
          b.amount.toFixed(2),
          b.currency,
          b.concept,
        ].join("|")
      );
    }
  }

  return `${lines.join("\n")}\n`;
}
