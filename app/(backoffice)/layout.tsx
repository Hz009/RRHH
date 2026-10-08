import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { stopViewAsAction } from "@/app/(backoffice)/employees/actions";
import { Sidebar } from "@/components/layout/sidebar";
import { ViewOnlyShield } from "@/components/layout/view-only-shield";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isDataReadOnly } from "@/lib/supabase/read-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewAsTarget } from "@/services/employees.service";

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  let role: "admin" | "manager" | "employee" = "admin";
  let employmentStatus: string | null = null;
  let viewAsName: string | null = null;
  let viewAsInactive = false;

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

    if (role === "admin" || role === "manager") {
      const viewAs = await getViewAsTarget();
      if (viewAs) {
        viewAsName = viewAs.fullName;
        viewAsInactive = viewAs.employmentStatus === "inactive";
        role = viewAs.role;
        if (viewAs.employmentStatus === "on_leave") employmentStatus = "on_leave";
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f4fafa_42%,_#e7f4f4_100%)]">
      {isDataReadOnly() ? (
        <p className="border-b border-lm-aqua/25 bg-lm-sky px-6 py-2.5 text-sm text-lm-dark-teal">
          Solo lectura. Los datos se consultan aquí y solo se modifican en el portal principal.
        </p>
      ) : null}
      {viewAsName ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8893a] bg-[#f0a04b] px-6 py-3 text-sm text-[#3d2914]">
          <p className="font-medium">
            Estás en el portal de {viewAsName}. Solo puedes ver.
            {viewAsInactive ? " Esta cuenta está inactiva." : ""}
          </p>
          <form action={stopViewAsAction} data-allow-view-as="exit">
            <button
              type="submit"
              className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-semibold text-[#3d2914] shadow-sm transition hover:bg-white"
            >
              Volver a mi portal
            </button>
          </form>
        </div>
      ) : null}
      {employmentStatus === "on_leave" ? (
        <p className="border-b border-amber-300 bg-amber-50 px-6 py-2.5 text-sm text-amber-950">
          Estás de baja. Puedes consultar el portal, pero no puedes pedir vacaciones hasta que vuelvas a estar activo.
        </p>
      ) : null}
      <div className="flex min-h-screen">
        <Sidebar role={role} />
        <ViewOnlyShield active={Boolean(viewAsName)}>
          <main className={viewAsName ? "view-only min-w-0 flex-1" : "min-w-0 flex-1"}>{children}</main>
        </ViewOnlyShield>
      </div>
    </div>
  );
}
