import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentEmployee, getCurrentUserRole, getEmployees } from "@/services/employees.service";
import type { Database } from "@/types/database";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

export interface DocumentWithAck extends DocumentRow {
  acknowledged: boolean;
  signedUrl: string | null;
  assignedEmployeeName: string | null;
}

export async function getDocumentsForCurrentUser(): Promise<DocumentWithAck[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();
  const role = await getCurrentUserRole();
  const currentEmployee = await getCurrentEmployee();
  const isAdmin = role === "admin";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: documents, error: docsError }, { data: acks, error: acksError }] =
    await Promise.all([
      adminSupabase.from("documents").select("*").order("created_at", { ascending: false }),
      adminSupabase.from("document_acknowledgements").select("*"),
    ]);

  if (docsError) throw new Error(`Error loading documents: ${docsError.message}`);
  if (acksError) throw new Error(`Error loading document acknowledgements: ${acksError.message}`);

  const allAcks = acks ?? [];
  const allDocs = documents ?? [];

  let employeeNameMap: Map<string, string> = new Map();
  if (isAdmin) {
    const employees = await getEmployees();
    employeeNameMap = new Map(employees.map((e) => [e.id, e.full_name]));
  }

  const employeeId = currentEmployee?.id ?? null;

  const filteredDocs = isAdmin
    ? allDocs
    : allDocs.filter(
        (doc) => doc.is_global || (employeeId && doc.employee_id === employeeId)
      );

  const docsWithUrls = await Promise.all(
    filteredDocs.map(async (doc) => {
      let acknowledged: boolean;
      if (isAdmin) {
        if (doc.is_global) {
          acknowledged = false;
        } else if (doc.employee_id) {
          acknowledged = allAcks.some(
            (a) =>
              a.document_id === doc.id && a.employee_id === doc.employee_id
          );
        } else {
          acknowledged = false;
        }
      } else {
        acknowledged = employeeId
          ? allAcks.some(
              (a) => a.document_id === doc.id && a.employee_id === employeeId
            )
          : false;
      }

      const { data: signed } = await adminSupabase.storage
        .from("hr-documents")
        .createSignedUrl(doc.file_path, 60 * 60);

      return {
        ...doc,
        acknowledged,
        signedUrl: signed?.signedUrl ?? null,
        assignedEmployeeName: doc.employee_id
          ? employeeNameMap.get(doc.employee_id) ?? null
          : null,
      };
    })
  );

  return docsWithUrls;
}

export async function createDocument(input: Record<string, unknown>) {
  const title = String(input.title ?? "").trim();
  const category = String(input.category ?? "other");
  const file_path = String(input.file_path ?? "").trim();
  const employee_id = input.employee_id ? String(input.employee_id) : null;
  const requires_ack = String(input.requires_ack ?? "") === "on";
  const is_global = String(input.is_global ?? "") === "on";

  if (!title || !file_path) {
    throw new Error("Datos incompletos para crear documento.");
  }

  if (!isSupabaseConfigured()) {
    return {
      id: `mock-doc-${Date.now()}`,
      employee_id,
      title,
      category,
      file_path,
      requires_ack,
      is_global,
      uploaded_by: null,
      created_at: new Date().toISOString(),
    };
  }

  const role = await getCurrentUserRole();
  if (role !== "admin") {
    throw new Error("Solo admin puede crear documentos.");
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Debes iniciar sesion para crear documentos.");

  const adminSupabase = createSupabaseAdminClient();

  let duplicateQuery = adminSupabase
    .from("documents")
    .select("id")
    .eq("title", title)
    .eq("category", category);

  if (is_global) {
    duplicateQuery = duplicateQuery.eq("is_global", true);
  } else if (employee_id) {
    duplicateQuery = duplicateQuery.eq("employee_id", employee_id);
  }

  const { data: existing } = await duplicateQuery.maybeSingle();
  if (existing) {
    throw new Error(
      "Ya existe un documento con el mismo titulo, categoria y empleado. Cambia el titulo para continuar."
    );
  }

  const { data, error } = await adminSupabase
    .from("documents")
    .insert({
      title,
      category,
      file_path,
      employee_id: is_global ? null : employee_id,
      requires_ack,
      is_global,
      uploaded_by: user.id,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Error creating document: ${error.message}`);
  return data;
}

export async function acknowledgeDocument(input: Record<string, unknown>) {
  const document_id = String(input.document_id ?? "");
  if (!document_id) throw new Error("Documento invalido.");

  if (!isSupabaseConfigured()) return;

  const currentEmployee = await getCurrentEmployee();

  const employeeId = currentEmployee?.id;
  if (!employeeId) {
    throw new Error(
      "No se encontro tu registro de empleado. Contacta al administrador."
    );
  }

  const adminSupabase = createSupabaseAdminClient();

  const { data: existing } = await adminSupabase
    .from("document_acknowledgements")
    .select("id")
    .eq("document_id", document_id)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (existing) return;

  const { error } = await adminSupabase
    .from("document_acknowledgements")
    .insert({
      document_id,
      employee_id: employeeId,
    });

  if (error) {
    throw new Error(`Error al registrar confirmacion: ${error.message}`);
  }
}

export async function getDocumentAssignableEmployees() {
  const role = await getCurrentUserRole();
  if (role !== "admin") return [];
  return getEmployees();
}
