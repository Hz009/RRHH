import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function ChangePasswordPage() {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard");
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.user_metadata?.must_change_password) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <Card
        title="Cambio de contrasena"
        description="Debes cambiar tu contrasena para continuar."
        className="w-full max-w-md"
      >
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
