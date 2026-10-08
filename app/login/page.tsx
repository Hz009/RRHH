import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { aviso?: string };
}) {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard");
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 items-center justify-center bg-lm-sidebar lg:flex">
        <div className="max-w-md px-12 text-center">
          <p className="text-sm font-semibold tracking-widest text-lm-aqua uppercase">LinguaMeeting</p>
          <h2 className="mt-4 text-3xl font-bold text-white">HRIS Back Office</h2>
          <p className="mt-4 text-zinc-400">
            Sistema interno de Recursos Humanos para la gestion de personal, vacaciones, documentos y mas.
          </p>
          <div className="mx-auto mt-8 h-1 w-16 rounded-full bg-lm-aqua" />
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#e7f4f4_100%)] px-6 lg:w-1/2">
        <div className="w-full max-w-sm rounded-3xl bg-white/90 p-8 shadow-[0_10px_40px_rgba(24,110,116,0.08)]">
          <div className="mb-8 lg:hidden">
            <p className="text-xs font-semibold tracking-widest text-lm-aqua uppercase">LinguaMeeting</p>
            <h2 className="mt-1 text-xl font-bold text-lm-dark-teal">HRIS Back Office</h2>
          </div>
          <h3 className="text-2xl font-semibold text-lm-dark-teal">Iniciar sesion</h3>
          <p className="mt-1 text-sm text-zinc-500">Ingresa tus credenciales para continuar.</p>
          {searchParams?.aviso === "inactivo" ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              Tu cuenta está inactiva. Ya no puedes entrar. Si crees que es un error, escribe a soporte de Recursos Humanos.
            </p>
          ) : null}
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
