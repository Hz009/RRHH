import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { sumWorkedHoursFromPunchEvents, periodMonthUtcRange } from "@/lib/attendance-hours";
import { getCurrentUserRole } from "@/services/employees.service";
import type { Database } from "@/types/database";

type AttendanceRow = Database["public"]["Tables"]["attendance_records"]["Row"];
type EventType = Database["public"]["Tables"]["attendance_records"]["Row"]["event_type"];

export async function getPunchHoursForEmployeeMonth(employeeId: string, periodMonthDate: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const { startIso, endIso } = periodMonthUtcRange(periodMonthDate);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("attendance_records")
    .select("event_type,occurred_at")
    .eq("employee_id", employeeId)
    .in("event_type", ["clock_in", "clock_out"])
    .gte("occurred_at", startIso)
    .lte("occurred_at", endIso)
    .order("occurred_at", { ascending: true });
  if (error) throw new Error(`Error cargando fichajes: ${error.message}`);
  return sumWorkedHoursFromPunchEvents(data ?? []);
}

export async function listAttendanceForEmployee(
  employeeId: string,
  limit = 80
): Promise<AttendanceRow[]> {
  if (!isSupabaseConfigured()) return [];
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("attendance_records")
    .select("*")
    .eq("employee_id", employeeId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Error listando fichajes: ${error.message}`);
  return data ?? [];
}

/** Último evento de fichaje (para saber si hay turno abierto). */
export async function getLastPunchEvent(employeeId: string): Promise<AttendanceRow | null> {
  if (!isSupabaseConfigured()) return null;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("attendance_records")
    .select("*")
    .eq("employee_id", employeeId)
    .in("event_type", ["clock_in", "clock_out"])
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Error fichaje: ${error.message}`);
  return data ?? null;
}

export function isShiftOpenFromLastEvent(last: AttendanceRow | null): boolean {
  return last?.event_type === "clock_in";
}

export async function punchSelf(eventType: EventType): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Fichaje no disponible sin Supabase.");
  }
  const role = await getCurrentUserRole();
  if (role !== "employee" && role !== "manager" && role !== "admin") {
    throw new Error("Sesion no autorizada para fichar.");
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesion requerida.");

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!profile) throw new Error("Perfil no encontrado.");

  const admin = createSupabaseAdminClient();
  const { data: emp, error: empErr } = await admin
    .from("employees")
    .select("id,employee_type,hourly_hours_source")
    .eq("email", String(user.email).toLowerCase())
    .maybeSingle();
  if (empErr || !emp) throw new Error("Empleado no encontrado.");
  if (emp.employee_type !== "hourly") {
    throw new Error("El fichaje solo aplica a colaboradores por horas con modo fichaje.");
  }
  const src = emp.hourly_hours_source ?? "manual_monthly";
  if (src !== "punch") {
    throw new Error("Tu contrato usa horas cargadas por administracion; no debes fichar aqui.");
  }

  if (eventType !== "clock_in" && eventType !== "clock_out") {
    throw new Error("Tipo de evento no valido.");
  }

  const last = await getLastPunchEvent(emp.id);
  if (eventType === "clock_in" && isShiftOpenFromLastEvent(last)) {
    throw new Error("Ya tienes una entrada abierta. Ficha salida primero.");
  }
  if (eventType === "clock_out" && !isShiftOpenFromLastEvent(last)) {
    throw new Error("No hay entrada abierta para cerrar.");
  }

  const { error } = await supabase.from("attendance_records").insert({
    employee_id: emp.id,
    event_type: eventType,
    occurred_at: new Date().toISOString(),
    source: "web",
    created_by: profile.id,
  });
  if (error) throw new Error(error.message);
}

export async function adminInsertAttendanceEvent(input: Record<string, unknown>): Promise<void> {
  const role = await getCurrentUserRole();
  if (role !== "admin") throw new Error("Solo administracion puede registrar fichajes ajenos.");

  if (!isSupabaseConfigured()) return;

  const employeeId = String(input.employee_id ?? "");
  const eventType = String(input.event_type ?? "") as EventType;
  const occurredAt = String(input.occurred_at ?? "");
  const note = input.note ? String(input.note) : null;

  if (!employeeId || !occurredAt) throw new Error("Empleado y fecha/hora obligatorios.");
  if (eventType !== "clock_in" && eventType !== "clock_out") {
    throw new Error("Tipo de evento debe ser entrada o salida.");
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesion requerida.");
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!profile) throw new Error("Perfil no encontrado.");

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("attendance_records").insert({
    employee_id: employeeId,
    event_type: eventType,
    occurred_at: new Date(occurredAt).toISOString(),
    source: "admin",
    note,
    created_by: profile.id,
  });
  if (error) throw new Error(error.message);
}

export async function adminDeleteAttendanceRecords(ids: string[]): Promise<void> {
  const role = await getCurrentUserRole();
  if (role !== "admin") throw new Error("Solo administracion puede eliminar fichajes.");
  if (!isSupabaseConfigured()) return;
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("attendance_records").delete().in("id", unique);
  if (error) throw new Error(error.message);
}

export async function adminUpdateAttendanceRecord(input: Record<string, unknown>): Promise<void> {
  const role = await getCurrentUserRole();
  if (role !== "admin") throw new Error("Solo administracion puede modificar fichajes.");
  if (!isSupabaseConfigured()) return;

  const id = String(input.id ?? "");
  const occurredAt = String(input.occurred_at ?? "");
  if (!id || !occurredAt) throw new Error("Registro y fecha/hora obligatorios.");

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("attendance_records")
    .update({ occurred_at: new Date(occurredAt).toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
