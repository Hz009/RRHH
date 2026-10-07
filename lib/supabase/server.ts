import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { withReadOnlyData } from "@/lib/supabase/read-only";

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return withReadOnlyData(createServerClient(
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
}
