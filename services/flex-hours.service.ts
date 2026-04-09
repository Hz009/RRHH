import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUserRole } from "@/services/employees.service";
import type { Database } from "@/types/database";
import type { Employee } from "@/types/domain";

export type HoursBalanceKind = Database["public"]["Tables"]["employee_hours_balance_ledger"]["Row"]["kind"];

type LedgerRow = Database["public"]["Tables"]["employee_hours_balance_ledger"]["Row"];

function assertFtOrPt(emp: Pick<Employee, "employee_type">) {
  if (emp.employee_type !== "full_time" && emp.employee_type !== "part_time") {
    throw new Error("La bolsa de horas libres solo aplica a full time o part time.");
  }
}

export async function getFlexHoursBalance(employeeId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("employee_hours_balance_ledger")
    .select("delta_hours")
    .eq("employee_id", employeeId);
  if (error) throw new Error(`Error saldo horas: ${error.message}`);
  return (data ?? []).reduce((s, r) => s + Number(r.delta_hours ?? 0), 0);
}

export async function listFlexHoursLedger(employeeId: string, limit = 100): Promise<LedgerRow[]> {
  if (!isSupabaseConfigured()) return [];
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("employee_hours_balance_ledger")
    .select("*")
    .eq("employee_id", employeeId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Error historial horas: ${error.message}`);
  return data ?? [];
}

export async function adminAddFlexHoursLedgerEntry(input: Record<string, unknown>): Promise<void> {
  const role = await getCurrentUserRole();
  if (role !== "admin") throw new Error("Solo administracion puede registrar movimientos.");
  if (!isSupabaseConfigured()) return;

  const employeeId = String(input.employee_id ?? "");
  const deltaHours = Number(input.delta_hours ?? 0);
  const kind = String(input.kind ?? "") as HoursBalanceKind;
  const occurredAt = String(input.occurred_at ?? "").slice(0, 10);
  const reason = input.reason ? String(input.reason).trim() : null;
  const note = input.note ? String(input.note).trim() : null;

  if (!employeeId || !occurredAt) throw new Error("Empleado y fecha obligatorios.");
  if (Number.isNaN(deltaHours) || deltaHours === 0) throw new Error("Las horas deben ser distintas de cero.");
  const allowed: HoursBalanceKind[] = ["grant", "use", "repay", "adjustment"];
  if (!allowed.includes(kind)) throw new Error("Tipo de movimiento no valido.");

  const admin = createSupabaseAdminClient();
  const { data: emp, error: e0 } = await admin
    .from("employees")
    .select("employee_type")
    .eq("id", employeeId)
    .maybeSingle();
  if (e0 || !emp) throw new Error("Empleado no encontrado.");
  assertFtOrPt(emp);

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesion requerida.");
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!profile) throw new Error("Perfil no encontrado.");

  const { error } = await admin.from("employee_hours_balance_ledger").insert({
    employee_id: employeeId,
    occurred_at: occurredAt,
    delta_hours: deltaHours,
    kind,
    reason,
    note,
    created_by: profile.id,
  });
  if (error) throw new Error(error.message);
}
