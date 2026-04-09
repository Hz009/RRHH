import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentEmployee, getCurrentUserRole } from "@/services/employees.service";

export interface LoginNotifications {
  pendingDocuments: Array<{
    id: string;
    title: string;
    category: string;
    signedUrl: string | null;
  }>;
  approvedVacations: Array<{
    id: string;
    start_date: string;
    end_date: string;
    days_requested: number;
  }>;
}

const EMPTY: LoginNotifications = { pendingDocuments: [], approvedVacations: [] };

export async function getLoginNotifications(): Promise<LoginNotifications> {
  if (!isSupabaseConfigured()) return EMPTY;

  const role = await getCurrentUserRole();
  if (role === "admin") return EMPTY;

  const supabase = createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return EMPTY;

  const currentEmployee = await getCurrentEmployee();
  const employeeId = currentEmployee?.id ?? null;

  if (!employeeId) return EMPTY;

  const [{ data: docs }, { data: acks }, { data: vacations }] =
    await Promise.all([
      adminSupabase
        .from("documents")
        .select("id,title,category,file_path,is_global,employee_id,requires_ack")
        .eq("requires_ack", true),
      adminSupabase
        .from("document_acknowledgements")
        .select("document_id")
        .eq("employee_id", employeeId),
      adminSupabase
        .from("vacation_requests")
        .select("id,start_date,end_date,days_requested,request_status")
        .eq("employee_id", employeeId)
        .eq("request_status", "approved")
        .gte("start_date", new Date().toISOString().slice(0, 10)),
    ]);

  const ackedIds = new Set((acks ?? []).map((a) => a.document_id));

  const relevantDocs = (docs ?? []).filter((doc) => {
    const isRelevant = doc.is_global || doc.employee_id === employeeId;
    return isRelevant && !ackedIds.has(doc.id);
  });

  const pendingDocuments = await Promise.all(
    relevantDocs.map(async (doc) => {
      const { data: signed } = await adminSupabase.storage
        .from("hr-documents")
        .createSignedUrl(doc.file_path, 60 * 60);

      return {
        id: doc.id,
        title: doc.title,
        category: doc.category,
        signedUrl: signed?.signedUrl ?? null,
      };
    })
  );

  const approvedVacations = (vacations ?? []).map((v) => ({
    id: v.id,
    start_date: v.start_date,
    end_date: v.end_date,
    days_requested: v.days_requested,
  }));

  return { pendingDocuments, approvedVacations };
}
