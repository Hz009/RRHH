import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isDataReadOnly } from "@/lib/supabase/read-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  let role: "admin" | "manager" | "employee" = "admin";
  let employmentStatus: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    if (user.user_metadata?.must_change_password && !isDataReadOnly()) {
      redirect("/change-password");
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role === "admin" || profile?.role === "manager" || profile?.role === "employee") {
      role = profile.role;
    } else {
      role = "employee";
    }

    if (user.email) {
      const admin = createSupabaseAdminClient();
      const { data: employee } = await admin
        .from("employees")
        .select("employment_status")
        .eq("email", user.email.toLowerCase())
        .maybeSingle();
      employmentStatus = employee?.employment_status ?? null;
      if (role !== "admin" && employmentStatus === "inactive") {
        await supabase.auth.signOut();
        redirect("/login?aviso=inactivo");
      }
    }

    const path = headers().get("x-pathname") ?? "";
    if (
      user.user_metadata?.must_complete_profile &&
      !isDataReadOnly() &&
      path !== "/employee-portal/datos"
    ) {
      redirect("/employee-portal/datos");
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f5fbfb_45%,_#edf7f7_100%)]">
      {isDataReadOnly() ? (
        <p className="border-b border-lm-aqua/30 bg-lm-sky px-6 py-2 text-sm text-lm-dark-teal">
          Solo lectura. Los datos se consultan aquí y solo se modifican en el portal principal.
        </p>
      ) : null}
      {employmentStatus === "on_leave" ? (
        <p className="border-b border-amber-300 bg-amber-50 px-6 py-2 text-sm text-amber-950">
          Estás de baja. Puedes consultar el portal, pero no puedes pedir vacaciones hasta que vuelvas a estar activo.
        </p>
      ) : null}
      <div className="flex min-h-screen">
        <Sidebar role={role} />
        <main className="w-full">{children}</main>
      </div>
    </div>
  );
}
