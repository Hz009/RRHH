import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import { withBlockedWrites, withReadOnlyData } from "@/lib/supabase/read-only";
import { VIEW_AS_BLOCK_MESSAGE, VIEW_AS_COOKIE } from "@/lib/view-as";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your .env.local file."
    );
  }

  const client = withReadOnlyData(
    createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  );

  try {
    if (cookies().get(VIEW_AS_COOKIE)?.value) {
      return withBlockedWrites(client, VIEW_AS_BLOCK_MESSAGE);
    }
  } catch {
    // Fuera de una petición no hay cookie de vista.
  }
  return client;
}
