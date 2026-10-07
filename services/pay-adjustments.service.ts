import { normalizePayrollCurrencyCode } from "@/lib/countries";
import {
  adjustmentTypeLabel,
  type PayAdjustmentKind,
  type PayRecurrence,
  DISCOUNT_TYPES,
  INCENTIVE_TYPES,
} from "@/lib/payslip";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUserRole } from "@/services/employees.service";

export interface PayAdjustmentRow {
  id: string;
  employee_id: string;
  kind: PayAdjustmentKind;
  adjustment_type: string;
  comment: string | null;
  amount: number;
  currency: string;
  recurrence: PayRecurrence;
  period_month: string;
  active: boolean;
}

function isMissingRelation(message: string) {
  return /does not exist|schema cache|employee_pay_adjustments/i.test(message);
}

async function requireAdmin() {
  const role = await getCurrentUserRole();
  if (role !== "admin") throw new Error("Solo el administrador puede gestionar incentivos y descuentos.");
}

function parseKind(value: string): PayAdjustmentKind {
  if (value === "incentive" || value === "discount") return value;
  throw new Error("Elige incentivo o descuento.");
}

function parseRecurrence(value: string): PayRecurrence {
  if (value === "once" || value === "monthly") return value;
  throw new Error("Elige si es puntual o mensual.");
}

export async function listPayAdjustments(employeeId: string): Promise<PayAdjustmentRow[]> {
  if (!isSupabaseConfigured()) return [];
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("employee_pay_adjustments")
    .select("id,employee_id,kind,adjustment_type,comment,amount,currency,recurrence,period_month,active")
    .eq("employee_id", employeeId)
    .order("period_month", { ascending: false });
  if (error) {
    if (isMissingRelation(error.message)) return [];
    throw new Error(`Error cargando incentivos y descuentos: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    id: String(row.id),
    employee_id: String(row.employee_id),
    kind: row.kind === "discount" ? "discount" : "incentive",
    adjustment_type: String(row.adjustment_type),
    comment: row.comment ? String(row.comment) : null,
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? "USD"),
    recurrence: row.recurrence === "monthly" ? "monthly" : "once",
    period_month: String(row.period_month).slice(0, 7),
    active: Boolean(row.active),
  }));
}

export async function createPayAdjustment(input: Record<string, unknown>) {
  await requireAdmin();
  const employeeId = String(input.employee_id ?? "");
  const kind = parseKind(String(input.kind ?? ""));
  const adjustmentType = String(input.adjustment_type ?? "");
  const comment = String(input.comment ?? "").trim();
  const amount = Number(input.amount ?? 0);
  const recurrence = parseRecurrence(String(input.recurrence ?? ""));
  const periodMonth = String(input.period_month ?? "");
  const allowed = kind === "incentive" ? INCENTIVE_TYPES : DISCOUNT_TYPES;
  if (!employeeId || !/^\d{4}-\d{2}$/.test(periodMonth)) throw new Error("Elige el mes.");
  if (!allowed.some((item) => item.value === adjustmentType)) throw new Error("Elige un tipo de la lista.");
  if (!comment) throw new Error("Escribe un comentario.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("El monto debe ser mayor que cero.");
  if (!isSupabaseConfigured()) return;

  const admin = createSupabaseAdminClient();
  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("current_salary_currency")
    .eq("id", employeeId)
    .maybeSingle();
  if (employeeError || !employee) throw new Error("No se encontró el empleado.");

  const { error } = await admin.from("employee_pay_adjustments").insert({
    employee_id: employeeId,
    kind,
    adjustment_type: adjustmentType,
    comment,
    amount,
    currency: normalizePayrollCurrencyCode(employee.current_salary_currency),
    recurrence,
    period_month: `${periodMonth}-01`,
    active: true,
  });
  if (error) {
    if (isMissingRelation(error.message)) {
      throw new Error("Falta crear la tabla de incentivos y descuentos en la base de datos.");
    }
    throw new Error(`No se pudo guardar: ${error.message}`);
  }
}

export async function deactivatePayAdjustment(input: Record<string, unknown>) {
  await requireAdmin();
  const id = String(input.id ?? "");
  if (!id || !isSupabaseConfigured()) return;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("employee_pay_adjustments").update({ active: false }).eq("id", id);
  if (error) throw new Error(`No se pudo quitar: ${error.message}`);
}

export function describeAdjustment(row: PayAdjustmentRow) {
  return `${row.kind === "incentive" ? "Incentivo" : "Descuento"} · ${adjustmentTypeLabel(row.kind, row.adjustment_type)}`;
}
