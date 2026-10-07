"use client";

import { createBrowserClient } from "@supabase/ssr";

import { withReadOnlyData } from "@/lib/supabase/read-only";

export function createSupabaseBrowserClient() {
  return withReadOnlyData(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
    )
  );
}
