"use server";

import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/services/audit.service";
import { acknowledgeDocument, createDocument } from "@/services/documents.service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function uploadAndCreateDocumentAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "other");
  const employeeId = String(formData.get("employee_id") ?? "");
  const isGlobal = String(formData.get("is_global") ?? "") === "on";
  const requiresAck = String(formData.get("requires_ack") ?? "") === "on";
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Debes seleccionar un archivo valido para subir." };
  }

  try {
    const supabase = createSupabaseServerClient();
    const extension = file.name.includes(".")
      ? file.name.split(".").pop()?.toLowerCase() ?? "bin"
      : "bin";
    const basePath = isGlobal
      ? "global"
      : `employees/${employeeId || "unassigned"}`;
    const objectPath = `${basePath}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("hr-documents")
      .upload(objectPath, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return { error: `Error al subir archivo: ${uploadError.message}` };
    }

    const payload = {
      title,
      category,
      employee_id: isGlobal ? "" : employeeId,
      is_global: isGlobal ? "on" : "",
      requires_ack: requiresAck ? "on" : "",
      file_path: objectPath,
    };

    const document = await createDocument(payload);

    await createAuditLog({
      module: "documents",
      action: "upload_document",
      entityName: "documents",
      entityId: document.id,
      newData: document,
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Error al crear documento.",
    };
  }

  revalidatePath("/documents");
  return { success: true };
}

export async function acknowledgeDocumentAction(formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  await acknowledgeDocument(payload);

  await createAuditLog({
    module: "documents",
    action: "acknowledge_document",
    entityName: "document_acknowledgements",
    entityId: String(payload.document_id ?? "unknown"),
    newData: payload,
  });

  revalidatePath("/documents");
  revalidatePath("/dashboard");
}
