type AppRole = "admin" | "manager" | "employee";

export function DashboardWelcome(props: { firstName: string | null; fullName: string | null; role: AppRole }) {
  const { firstName, fullName, role } = props;
  const name = firstName?.trim() || fullName?.split(/\s+/)[0] || null;

  const line =
    role === "admin"
      ? "Resumen operativo del equipo y nominas."
      : role === "manager"
        ? "Aqui ves el estado de tu equipo y las gestiones pendientes."
        : "Tu espacio para revisar avisos, vacaciones y datos personales.";

  return (
    <section
      className="rounded-2xl border border-lm-aqua/25 bg-gradient-to-br from-lm-sky/80 to-lm-sky/40 px-5 py-6 sm:px-8 sm:py-7"
      aria-labelledby="dashboard-welcome-heading"
    >
      <h1 id="dashboard-welcome-heading" className="text-xl font-semibold text-lm-dark-teal sm:text-2xl">
        {name ? <>Hola, {name}</> : <>Bienvenido</>}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-700 sm:text-base">{line}</p>
    </section>
  );
}
