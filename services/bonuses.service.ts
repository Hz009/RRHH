import { normalizePayrollCurrencyCode } from "@/lib/countries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createAuditLog } from "@/services/audit.service";

import { getCurrentEmployee, getCurrentUserRole, getEmployees } from "@/services/employees.service";

export interface MonthlyBonusRow {
  id: string;
  employee_id: string;
  period_month: string;
  bonus_date: string;
  amount: number;
  currency: string;
  concept: string;
  created_at: string;
  updated_at: string;
}

function periodYmFromDate(d: string): string {
  return String(d).slice(0, 7);
}

function toPeriodFirstDay(periodMonthYm: string): string {
  const m = String(periodMonthYm ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(m)) {
    throw new Error("Mes invalido. Usa formato YYYY-MM.");
  }
  return `${m}-01`;
}

/** Single calendar value YYYY-MM-DD → bonus row + payroll period (first day of that month). */
async function getExpectedPayrollCurrencyForPeriod(employeeId: string, periodMonthYm: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const periodDate = toPeriodFirstDay(periodMonthYm);
  const periodEnd = new Date(`${periodDate}T12:00:00`);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  periodEnd.setDate(0);
  const periodEndStr = periodEnd.toISOString().slice(0, 10);

  const { data: comp } = await admin
    .from("employee_compensation_history")
    .select("currency")
    .eq("employee_id", employeeId)
    .lte("effective_date", periodEndStr)
    .order("effective_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (comp?.currency) return normalizePayrollCurrencyCode(comp.currency);

  const { data: emp } = await admin
    .from("employees")
    .select("current_salary_currency")
    .eq("id", employeeId)
    .maybeSingle();

  return normalizePayrollCurrencyCode(emp?.current_salary_currency);
}

function parseBonusDateFromPicker(raw: string): { bonus_date: string; periodDate: string; periodMonthYm: string } {
  const s = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error("Selecciona una fecha valida en el calendario.");
  }
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  const check = new Date(y, m - 1, d);
  if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d) {
    throw new Error("La fecha seleccionada no es valida.");
  }
  const periodMonthYm = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}`;
  return { bonus_date: s, periodDate: `${periodMonthYm}-01`, periodMonthYm };
}

async function assertCanViewEmployee(employeeId: string) {
  const role = await getCurrentUserRole();
  if (role === "admin") return;

  const current = await getCurrentEmployee();
  if (role === "employee") {
    if (!current || current.id !== employeeId) {
      throw new Error("No autorizado.");
    }
    return;
  }

  if (role === "manager" && current) {
    const visible = await getEmployees();
    if (visible.some((e) => e.id === employeeId)) return;
  }

  throw new Error("No autorizado.");
}

async function requireAdmin() {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    throw new Error("Solo el administrador puede gestionar bonos.");
  }
}

export async function isEmployeePeriodPaid(employeeId: string, periodMonthYm: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const admin = createSupabaseAdminClient();
  const periodDate = toPeriodFirstDay(periodMonthYm);
  const { data } = await admin
    .from("employee_payments")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("period_month", periodDate)
    .maybeSingle();

  return Boolean(data?.id);
}

/** Period months (YYYY-MM) that already have a registered payment for this employee. */
export async function getPaidPeriodMonthsForEmployee(employeeId: string, periodMonthsYm: string[]): Promise<Set<string>> {
  const set = new Set<string>();
  if (!isSupabaseConfigured() || !periodMonthsYm.length) return set;

  const admin = createSupabaseAdminClient();
  const dates = [...new Set(periodMonthsYm.map((ym) => toPeriodFirstDay(ym)))];
  const { data, error } = await admin
    .from("employee_payments")
    .select("period_month")
    .eq("employee_id", employeeId)
    .in("period_month", dates);

  if (error) throw new Error(`Error verificando pagos: ${error.message}`);
  for (const row of data ?? []) {
    set.add(String(row.period_month).slice(0, 7));
  }
  return set;
}

export async function getMonthlyBonusesForEmployee(employeeId: string): Promise<MonthlyBonusRow[]> {
  await assertCanViewEmployee(employeeId);

  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("employee_monthly_bonuses")
    .select("*")
    .eq("employee_id", employeeId)
    .order("period_month", { ascending: false })
    .order("bonus_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Error cargando bonos: ${error.message}`);
  return (data ?? []) as MonthlyBonusRow[];
}

export async function createMonthlyBonus(input: Record<string, unknown>) {
  await requireAdmin();
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase no esta configurado.");
  }

  const employee_id = String(input.employee_id ?? "");
  const bonusDateRaw = String(input.bonus_date ?? "").trim();
  const amount = Number(input.amount ?? 0);
  const concept = String(input.concept ?? "").trim();
  const currency = normalizePayrollCurrencyCode(input.currency);

  if (!employee_id || !bonusDateRaw || !concept) {
    throw new Error("Completa empleado, fecha del bono y concepto.");
  }
  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error("El monto debe ser mayor a cero.");
  }

  const { bonus_date, periodDate, periodMonthYm } = parseBonusDateFromPicker(bonusDateRaw);

  const expectedCurrency = await getExpectedPayrollCurrencyForPeriod(employee_id, periodMonthYm);
  if (currency !== expectedCurrency) {
    throw new Error(
      `La moneda del bono debe ser la misma que la nomina del periodo (${expectedCurrency}). Ajusta el campo moneda.`
    );
  }

  const paid = await isEmployeePeriodPaid(employee_id, periodMonthYm);
  if (paid) {
    throw new Error("Este mes ya tiene pago registrado. No se pueden añadir bonos.");
  }

  const admin = createSupabaseAdminClient();
  const { data: emp, error: empErr } = await admin
    .from("employees")
    .select("hire_date")
    .eq("id", employee_id)
    .maybeSingle();
  if (empErr) throw new Error(`Error validando empleado: ${empErr.message}`);
  if (emp?.hire_date && bonus_date < emp.hire_date) {
    throw new Error("La fecha del bono no puede ser anterior a la fecha de contratacion.");
  }

  const { data, error } = await admin
    .from("employee_monthly_bonuses")
    .insert({
      employee_id,
      period_month: periodDate,
      bonus_date,
      amount,
      currency,
      concept,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Error guardando bono: ${error.message}`);

  const row = data as MonthlyBonusRow;
  await createAuditLog({
    module: "employee_monthly_bonuses",
    action: "create",
    entityName: "employee_monthly_bonuses",
    entityId: row.id,
    newData: row,
  });
  return row;
}

export async function updateMonthlyBonus(input: Record<string, unknown>) {
  await requireAdmin();
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase no esta configurado.");
  }

  const id = String(input.id ?? "");
  const employee_id = String(input.employee_id ?? "");
  const bonusDateRaw = String(input.bonus_date ?? "").trim();
  const amount = Number(input.amount ?? 0);
  const concept = String(input.concept ?? "").trim();
  const currency = normalizePayrollCurrencyCode(input.currency);

  if (!id || !employee_id || !bonusDateRaw || !concept) {
    throw new Error("Datos incompletos para actualizar el bono.");
  }
  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error("El monto debe ser mayor a cero.");
  }

  const { bonus_date, periodDate, periodMonthYm } = parseBonusDateFromPicker(bonusDateRaw);

  const expectedCurrency = await getExpectedPayrollCurrencyForPeriod(employee_id, periodMonthYm);
  if (currency !== expectedCurrency) {
    throw new Error(
      `La moneda del bono debe ser la misma que la nomina del periodo (${expectedCurrency}). Ajusta el campo moneda.`
    );
  }

  const paid = await isEmployeePeriodPaid(employee_id, periodMonthYm);
  if (paid) {
    throw new Error("Este mes ya tiene pago registrado. No se puede editar el bono.");
  }

  const admin = createSupabaseAdminClient();

  const { data: previous, error: prevErr } = await admin
    .from("employee_monthly_bonuses")
    .select("*")
    .eq("id", id)
    .eq("employee_id", employee_id)
    .maybeSingle();
  if (prevErr) throw new Error(`Error cargando bono: ${prevErr.message}`);
  if (!previous) throw new Error("Bono no encontrado.");

  const { data: emp, error: empErr } = await admin
    .from("employees")
    .select("hire_date")
    .eq("id", employee_id)
    .maybeSingle();
  if (empErr) throw new Error(`Error validando empleado: ${empErr.message}`);
  if (emp?.hire_date && bonus_date < emp.hire_date) {
    throw new Error("La fecha del bono no puede ser anterior a la fecha de contratacion.");
  }

  const { data, error } = await admin
    .from("employee_monthly_bonuses")
    .update({
      period_month: periodDate,
      bonus_date,
      amount,
      currency,
      concept,
    })
    .eq("id", id)
    .eq("employee_id", employee_id)
    .select("*")
    .single();

  if (error) throw new Error(`Error actualizando bono: ${error.message}`);

  const row = data as MonthlyBonusRow;
  await createAuditLog({
    module: "employee_monthly_bonuses",
    action: "update",
    entityName: "employee_monthly_bonuses",
    entityId: id,
    previousData: previous,
    newData: row,
  });
  return row;
}

export async function deleteMonthlyBonus(input: Record<string, unknown>) {
  await requireAdmin();
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase no esta configurado.");
  }

  const id = String(input.id ?? "");
  const employee_id = String(input.employee_id ?? "");
  if (!id || !employee_id) {
    throw new Error("Faltan datos para eliminar el bono.");
  }

  const admin = createSupabaseAdminClient();
  const { data: row, error: loadErr } = await admin
    .from("employee_monthly_bonuses")
    .select("*")
    .eq("id", id)
    .eq("employee_id", employee_id)
    .maybeSingle();

  if (loadErr) throw new Error(`Error cargando bono: ${loadErr.message}`);
  if (!row) throw new Error("Bono no encontrado.");

  const periodYm = periodYmFromDate(row.period_month);
  const paid = await isEmployeePeriodPaid(employee_id, periodYm);
  if (paid) {
    throw new Error("Este mes ya tiene pago registrado. No se puede eliminar el bono.");
  }

  const { error } = await admin.from("employee_monthly_bonuses").delete().eq("id", id).eq("employee_id", employee_id);

  if (error) throw new Error(`Error eliminando bono: ${error.message}`);

  await createAuditLog({
    module: "employee_monthly_bonuses",
    action: "delete",
    entityName: "employee_monthly_bonuses",
    entityId: id,
    previousData: row,
  });
}
