import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface PendingDocConfirmationRow {
  documentId: string;
  title: string;
  category: string;
  employeeId: string;
  employeeName: string;
}

export interface PendingVacationApprovalRow {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  reason: string | null;
}

export async function getPendingDocumentConfirmationsForAdmin(limit = 12): Promise<PendingDocConfirmationRow[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdminClient();
  const { data: docs, error: dErr } = await admin
    .from("documents")
    .select("id,title,category,employee_id,is_global,requires_ack")
    .eq("requires_ack", true)
    .not("employee_id", "is", null);

  if (dErr) throw new Error(`Error cargando documentos: ${dErr.message}`);
  const assigned = (docs ?? []).filter((d) => d.employee_id && !d.is_global);
  if (!assigned.length) return [];

  const docIds = assigned.map((d) => d.id);
  const { data: acks, error: aErr } = await admin
    .from("document_acknowledgements")
    .select("document_id,employee_id")
    .in("document_id", docIds);

  if (aErr) throw new Error(`Error cargando confirmaciones: ${aErr.message}`);
  const acked = new Set((acks ?? []).map((a) => `${a.document_id}:${a.employee_id}`));

  const pending: PendingDocConfirmationRow[] = [];
  for (const d of assigned) {
    const empId = d.employee_id as string;
    if (acked.has(`${d.id}:${empId}`)) continue;
    const { data: emp } = await admin.from("employees").select("full_name").eq("id", empId).maybeSingle();
    pending.push({
      documentId: d.id,
      title: d.title,
      category: d.category,
      employeeId: empId,
      employeeName: emp?.full_name ?? "Empleado",
    });
    if (pending.length >= limit) break;
  }

  return pending;
}

export async function getPendingVacationApprovalsForAdmin(limit = 12): Promise<PendingVacationApprovalRow[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdminClient();
  const { data: fallback, error: e2 } = await admin
    .from("vacation_requests")
    .select("id,employee_id,start_date,end_date,days_requested,reason,created_at")
    .eq("request_status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (e2) throw new Error(`Error cargando vacaciones: ${e2.message}`);
  const ids = [...new Set((fallback ?? []).map((r) => r.employee_id))];
  if (!ids.length) return [];

  const { data: emps } = await admin.from("employees").select("id,full_name").in("id", ids);
  const map = new Map((emps ?? []).map((e) => [e.id, e.full_name]));

  return (fallback ?? []).map((r) => ({
    id: r.id,
    employeeId: r.employee_id,
    employeeName: map.get(r.employee_id) ?? "Empleado",
    startDate: r.start_date,
    endDate: r.end_date,
    daysRequested: r.days_requested,
    reason: r.reason,
  }));
}
