import Link from "next/link";

import { DashboardSectionTitle } from "@/components/dashboard/dashboard-section-title";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { employeeInitials } from "@/lib/employee-display";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types/domain";

type Role = "admin" | "manager" | "employee";

export function DashboardRecentHires(props: {
  employees: Employee[];
  totalInScope: number;
  role: Role;
  isAdmin: boolean;
  showPayrollChart: boolean;
}) {
  const { employees, totalInScope, role, isAdmin, showPayrollChart } = props;

  const title =
    role === "admin"
      ? "Ultimas altas"
      : role === "manager"
        ? "Ultimas altas en tu equipo"
        : "Personas en tu ambito";

  const subtitle =
    role === "admin"
      ? "Ordenadas por fecha de registro en el sistema."
      : role === "manager"
        ? "Colaboradores bajo tu responsabilidad, los mas recientes primero."
        : "Visibilidad segun tu rol; ordenadas por fecha de alta.";

  return (
    <Card
      className={cn(
        "border-l-4 border-l-lm-aqua/70 shadow-sm ring-1 ring-lm-aqua/10",
        showPayrollChart ? "lg:col-span-1" : "max-w-2xl"
      )}
      bodyClassName="mt-0 space-y-0"
    >
      <div>
        <div className="space-y-1 border-b border-lm-aqua/15 pb-4">
          <DashboardSectionTitle>{title}</DashboardSectionTitle>
          <p className="pl-3.5 text-xs leading-relaxed text-zinc-600 sm:text-sm">
            {subtitle}
            {totalInScope > 5 ? ` Hay ${totalInScope} en tu vista.` : null}
          </p>
        </div>

        <div className="mt-4 space-y-3">
        {employees.length === 0 ? (
          <div className="rounded-xl border border-dashed border-lm-aqua/40 bg-lm-sky/30 px-4 py-8 text-center">
            <p className="text-sm font-medium text-lm-dark-teal">No hay registros que mostrar</p>
            <p className="mt-1 text-xs text-zinc-600">
              Cuando haya altas en tu ambito, apareceran aqui.
            </p>
            <Link href="/employees" className="mt-4 inline-block">
              <Button type="button" variant="secondary" className="min-h-11 px-5">
                Ir a empleados
              </Button>
            </Link>
          </div>
        ) : (
          employees.map((employee) => (
            <div
              key={employee.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-lm-aqua/20 bg-white/80 px-3 py-2.5 transition-colors hover:border-lm-aqua/50 hover:bg-lm-sky/20"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lm-sky text-xs font-bold text-lm-dark-teal ring-2 ring-lm-aqua/30"
                  aria-hidden
                >
                  {employeeInitials(employee.full_name)}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/employees/${employee.id}`}
                    className="block truncate text-sm font-semibold text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lm-aqua/50 sm:text-base"
                  >
                    {employee.full_name}
                  </Link>
                  <p className="truncate text-xs text-zinc-600 sm:text-sm">
                    {employee.department} — {employee.job_title}
                  </p>
                </div>
              </div>
              {isAdmin ? (
                <Link
                  href={`/employees/${employee.id}/edit`}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-medium text-lm-dark-teal underline-offset-4 hover:text-lm-aqua hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lm-aqua/50"
                >
                  Editar
                </Link>
              ) : null}
            </div>
          ))
        )}
        </div>

        {employees.length > 0 ? (
          <div className="mt-5">
            <Link href="/employees">
              <Button type="button" variant="primary" className="min-h-11 w-full sm:w-auto">
                Ver listado completo
              </Button>
            </Link>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
