import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { withBlockedWrites, withReadOnlyData } from "@/lib/supabase/read-only";
import { VIEW_AS_BLOCK_MESSAGE, VIEW_AS_COOKIE } from "@/lib/view-as";

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  const client = withReadOnlyData(createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component — safe to ignore
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Called from a Server Component — safe to ignore
          }
        },
      },
    }
  ));

  if (cookieStore.get(VIEW_AS_COOKIE)?.value) {
    return withBlockedWrites(client, VIEW_AS_BLOCK_MESSAGE);
  }
  return client;
}
