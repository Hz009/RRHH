import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  let role: "admin" | "manager" | "employee" = "admin";

  if (isSupabaseConfigured()) {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    if (user.user_metadata?.must_change_password) {
      redirect("/change-password");
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role === "admin" || profile?.role === "manager" || profile?.role === "employee") {
      role = profile.role;
    } else {
      role = "employee";
    }
  }

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f5fbfb_45%,_#edf7f7_100%)]">
      <Sidebar role={role} />
      <main className="w-full">{children}</main>
    </div>
  );
}
