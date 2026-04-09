import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

interface AuditPayload {
  module: string;
  action: string;
  entityName: string;
  entityId: string;
  previousData?: unknown;
  newData?: unknown;
}

export async function createAuditLog(payload: AuditPayload) {
  if (!isSupabaseConfigured()) return;

  const supabase = createSupabaseServerClient();
  const row: Database["public"]["Tables"]["audit_logs"]["Insert"] = {
    module: payload.module,
    action: payload.action,
    entity_name: payload.entityName,
    entity_id: payload.entityId,
    previous_data: (payload.previousData as Database["public"]["Tables"]["audit_logs"]["Row"]["previous_data"]) ?? null,
    new_data: (payload.newData as Database["public"]["Tables"]["audit_logs"]["Row"]["new_data"]) ?? null,
  };

  await supabase.from("audit_logs").insert(row as never);
}
