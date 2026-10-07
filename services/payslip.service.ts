import { periodMonthUtcRange, sumWorkedHoursFromPunchEvents } from "@/lib/attendance-hours";
import {
  adjustmentTypeLabel,
  appliesInMonth,
  daysInMonth,
  loanAmountForMonth,
  monthLabel,
  overlapDays,
  periodBounds,
  sameCurrency,
  type PayslipLine,
} from "@/lib/payslip";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentEmployee } from "@/services/employees.service";

export interface Payslip {
  periodMonth: string;
  periodLabel: string;
  fullName: string;
  jobTitle: string;
  hireDate: string;
  currency: string;
  contractedAmount: number;
  hourly: boolean;
  basePay: number;
  daysWorked: number;
  daysNotWorked: number;
  bonuses: PayslipLine[];
  incentives: PayslipLine[];
  discounts: PayslipLine[];
  loans: PayslipLine[];
  totalIncome: number;
  totalDiscount: number;
  net: number;
}

interface AdjustmentRecord {
  employee_id: string;
  kind: string;
  adjustment_type: string;
  comment: string | null;
  amount: number;
  currency: string;
  recurrence: string;
  period_month: string;
  active: boolean;
}

interface LoanRecord {
  id: string;
  employee_id: string;
  description: string;
  installment_amount: number;
  outstanding_balance: number;
  currency: string;
  start_date: string;
  status: string;
}

interface RepaymentRecord {
  loan_id: string;
  employee_id: string;
  amount: number;
  paid_on: string;
  payroll_period: string | null;
}

function missingTable(message: string) {
  return /does not exist|schema cache|employee_pay_adjustments/i.test(message);
}

async function loadAdjustments(employeeIds: string[]): Promise<AdjustmentRecord[]> {
  if (employeeIds.length === 0) return [];
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("employee_pay_adjustments")
    .select("employee_id,kind,adjustment_type,comment,amount,currency,recurrence,period_month,active")
    .in("employee_id", employeeIds)
    .eq("active", true);
  if (error) {
    if (missingTable(error.message)) return [];
    throw new Error(`Error cargando incentivos y descuentos: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    employee_id: String(row.employee_id),
    kind: String(row.kind),
    adjustment_type: String(row.adjustment_type),
    comment: row.comment ? String(row.comment) : null,
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? "USD"),
    recurrence: String(row.recurrence),
    period_month: String(row.period_month).slice(0, 7),
    active: Boolean(row.active),
  }));
}

async function loadLoans(employeeIds: string[]) {
  if (employeeIds.length === 0) return { loans: [] as LoanRecord[], repayments: [] as RepaymentRecord[] };
  const admin = createSupabaseAdminClient();
  const [{ data: loans, error: loanError }, { data: repayments, error: repaymentError }] = await Promise.all([
    admin
      .from("employee_loans")
      .select("id,employee_id,description,installment_amount,outstanding_balance,currency,start_date,status")
      .in("employee_id", employeeIds)
      .in("status", ["active", "paid"]),
    admin.from("loan_repayments").select("loan_id,employee_id,amount,paid_on,payroll_period").in("employee_id", employeeIds),
  ]);
  if (loanError) throw new Error(`Error cargando préstamos: ${loanError.message}`);
  if (repaymentError) throw new Error(`Error cargando cuotas: ${repaymentError.message}`);
  return {
    loans: (loans ?? []).map((row) => ({
      id: String(row.id),
      employee_id: String(row.employee_id),
      description: String(row.description ?? "Préstamo"),
      installment_amount: Number(row.installment_amount ?? 0),
      outstanding_balance: Number(row.outstanding_balance ?? 0),
      currency: String(row.currency ?? "USD"),
      start_date: String(row.start_date).slice(0, 10),
      status: String(row.status),
    })),
    repayments: (repayments ?? []).map((row) => ({
      loan_id: String(row.loan_id),
      employee_id: String(row.employee_id),
      amount: Number(row.amount ?? 0),
      paid_on: String(row.paid_on).slice(0, 10),
      payroll_period: row.payroll_period ? String(row.payroll_period).slice(0, 7) : null,
    })),
  };
}

function linesForEmployee(
  employeeId: string,
  periodMonth: string,
  currency: string,
  adjustments: AdjustmentRecord[],
  loans: LoanRecord[],
  repayments: RepaymentRecord[]
) {
  const { start, end } = periodBounds(periodMonth);
  const incentives: PayslipLine[] = [];
  const discounts: PayslipLine[] = [];
  for (const row of adjustments) {
    if (row.employee_id !== employeeId || !row.active) continue;
    if (!sameCurrency(row.currency, currency)) continue;
    if (!appliesInMonth(row.recurrence, row.period_month, periodMonth)) continue;
    const line = {
      label: adjustmentTypeLabel(row.kind === "discount" ? "discount" : "incentive", row.adjustment_type),
      comment: row.comment,
      amount: row.amount,
    };
    if (row.kind === "discount") discounts.push(line);
    else incentives.push(line);
  }

  const loanLines: PayslipLine[] = [];
  for (const loan of loans) {
    if (loan.employee_id !== employeeId || !sameCurrency(loan.currency, currency)) continue;
    const repaidThisMonth = repayments
      .filter((repayment) => {
        if (repayment.loan_id !== loan.id) return false;
        if (repayment.payroll_period === periodMonth) return true;
        return repayment.paid_on >= start && repayment.paid_on <= end;
      })
      .reduce((sum, repayment) => sum + repayment.amount, 0);
    const amount = loan.status === "paid" && repaidThisMonth <= 0
      ? 0
      : loanAmountForMonth({
      installmentAmount: loan.installment_amount,
      outstandingBalance: loan.outstanding_balance,
      repaidThisMonth,
      startDate: loan.start_date,
      monthEnd: end,
    });
    if (amount > 0) {
      loanLines.push({ label: "Préstamo", comment: loan.description, amount });
    }
  }

  return { incentives, discounts, loans: loanLines };
}

export async function payrollExtrasForMonth(employeeIds: string[], periodMonth: string, currencyByEmployee: Map<string, string>) {
  const [adjustments, { loans, repayments }] = await Promise.all([loadAdjustments(employeeIds), loadLoans(employeeIds)]);
  const result = new Map<string, { incentive: number; discount: number; loan: number }>();
  for (const employeeId of employeeIds) {
    const currency = currencyByEmployee.get(employeeId) ?? "USD";
    const lines = linesForEmployee(employeeId, periodMonth, currency, adjustments, loans, repayments);
    result.set(employeeId, {
      incentive: lines.incentives.reduce((sum, line) => sum + line.amount, 0),
      discount: lines.discounts.reduce((sum, line) => sum + line.amount, 0),
      loan: lines.loans.reduce((sum, line) => sum + line.amount, 0),
    });
  }
  return result;
}

export async function payrollNetsForEmployee(
  employeeId: string,
  months: Array<{ periodMonth: string; currency: string; income: number }>
) {
  const [adjustments, { loans, repayments }] = await Promise.all([
    loadAdjustments([employeeId]),
    loadLoans([employeeId]),
  ]);
  return months.map((month) => {
    const lines = linesForEmployee(employeeId, month.periodMonth, month.currency, adjustments, loans, repayments);
    const extraIncome = lines.incentives.reduce((sum, line) => sum + line.amount, 0);
    const cuts = [...lines.discounts, ...lines.loans].reduce((sum, line) => sum + line.amount, 0);
    return month.income + extraIncome - cuts;
  });
}

async function absenceDays(employeeId: string, periodMonth: string) {
  const { start, end } = periodBounds(periodMonth);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("vacation_requests")
    .select("start_date,end_date")
    .eq("employee_id", employeeId)
    .eq("request_status", "approved")
    .lte("start_date", end)
    .gte("end_date", start);
  if (error) return 0;
  const total = (data ?? []).reduce(
    (sum, row) => sum + overlapDays(String(row.start_date), String(row.end_date), start, end),
    0
  );
  return Math.min(total, daysInMonth(periodMonth));
}

async function hoursForMonth(employeeId: string, periodMonth: string, hourlySource: string | null) {
  const admin = createSupabaseAdminClient();
  const periodDate = `${periodMonth}-01`;
  if (hourlySource === "punch") {
    const { startIso, endIso } = periodMonthUtcRange(periodDate);
    const { data } = await admin
      .from("attendance_records")
      .select("event_type,occurred_at")
      .eq("employee_id", employeeId)
      .in("event_type", ["clock_in", "clock_out"])
      .gte("occurred_at", startIso)
      .lte("occurred_at", endIso)
      .order("occurred_at", { ascending: true });
    return sumWorkedHoursFromPunchEvents(data ?? []);
  }
  const { data } = await admin
    .from("employee_monthly_hours")
    .select("hours_worked")
    .eq("employee_id", employeeId)
    .eq("period_month", periodDate)
    .maybeSingle();
  return Number(data?.hours_worked ?? 0);
}

export async function buildMyPayslip(periodMonth: string): Promise<Payslip | null> {
  if (!/^\d{4}-\d{2}$/.test(periodMonth) || !isSupabaseConfigured()) return null;
  const me = await getCurrentEmployee();
  if (!me) return null;
  if (me.hire_date && me.hire_date > periodBounds(periodMonth).end) return null;

  const admin = createSupabaseAdminClient();
  const currency = me.current_salary_currency || "USD";
  const rate = Number(me.current_salary_amount ?? 0);
  const hourly = me.employee_type === "hourly";
  const hours = hourly ? await hoursForMonth(me.id, periodMonth, me.hourly_hours_source) : 0;
  const basePay = hourly ? rate * hours : rate;

  const { data: bonusRows } = await admin
    .from("employee_monthly_bonuses")
    .select("concept,amount,currency,period_month")
    .eq("employee_id", me.id)
    .eq("period_month", `${periodMonth}-01`);
  const bonuses: PayslipLine[] = (bonusRows ?? [])
    .filter((row) => sameCurrency(String(row.currency), currency))
    .map((row) => ({ label: "Bono", comment: String(row.concept ?? ""), amount: Number(row.amount ?? 0) }));

  const [adjustments, loanData, notWorked] = await Promise.all([
    loadAdjustments([me.id]),
    loadLoans([me.id]),
    absenceDays(me.id, periodMonth),
  ]);
  const extra = linesForEmployee(me.id, periodMonth, currency, adjustments, loanData.loans, loanData.repayments);
  const totalIncome = basePay + bonuses.reduce((sum, line) => sum + line.amount, 0) + extra.incentives.reduce((sum, line) => sum + line.amount, 0);
  const totalDiscount = [...extra.discounts, ...extra.loans].reduce((sum, line) => sum + line.amount, 0);
  const monthDays = daysInMonth(periodMonth);

  return {
    periodMonth,
    periodLabel: monthLabel(periodMonth),
    fullName: me.full_name,
    jobTitle: me.job_title,
    hireDate: me.hire_date,
    currency,
    contractedAmount: rate,
    hourly,
    basePay,
    daysWorked: Math.max(monthDays - notWorked, 0),
    daysNotWorked: notWorked,
    bonuses,
    incentives: extra.incentives,
    discounts: extra.discounts,
    loans: extra.loans,
    totalIncome,
    totalDiscount,
    net: totalIncome - totalDiscount,
  };
}
