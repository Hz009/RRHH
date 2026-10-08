import Link from "next/link";

import { startViewAsAction } from "@/app/(backoffice)/employees/actions";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Notice } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Table } from "@/components/ui/table";
import { employmentStatusLabel } from "@/lib/employee-display";
import { LINGUAMEETING_DEPARTMENTS } from "@/lib/employee-taxonomy";
import { formatCurrency } from "@/lib/utils";
import { getCurrentEmployee, getCurrentUserRole, getEmployeesPaged } from "@/services/employees.service";

interface EmployeesPageProps {
  searchParams: {
    q?: string;
    department?: string;
    status?: string;
    emp_type?: string;
    profile_role?: string;
    saved?: string;
    page?: string;
  };
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const page = Math.max(1, parseInt(String(searchParams.page ?? "1"), 10) || 1);
  const [{ employees, total, page: safePage, pageSize }, role, currentEmployee] = await Promise.all([
    getEmployeesPaged({
      query: searchParams.q,
      department: searchParams.department,
      status: searchParams.status,
      employeeType: searchParams.emp_type,
      profileRole: searchParams.profile_role,
      page,
      pageSize: 10,
    }),
    getCurrentUserRole(),
    getCurrentEmployee(),
  ]);
  const isAdmin = role === "admin";
  const canOpenPortals = isAdmin || role === "manager";
  const savedCreate = searchParams.saved === "create";
  const savedUpdate = searchParams.saved === "update";

  const listQuery: Record<string, string | undefined> = {
    ...(searchParams.q ? { q: searchParams.q } : {}),
    ...(searchParams.department ? { department: searchParams.department } : {}),
    ...(searchParams.status ? { status: searchParams.status } : {}),
    ...(searchParams.emp_type ? { emp_type: searchParams.emp_type } : {}),
    ...(searchParams.profile_role ? { profile_role: searchParams.profile_role } : {}),
  };

  return (
    <div>
      <Topbar title="Empleados" subtitle="Gestion del personal de back office con filtros y acciones clave." />
      <div className="space-y-6 p-6">
        {savedCreate ? <Notice tone="success">Se creo el empleado correctamente.</Notice> : null}
        {savedUpdate ? <Notice tone="success">Se guardaron los cambios del empleado.</Notice> : null}
        <Card>
          <form className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Input name="q" placeholder="Buscar por nombre o email" defaultValue={searchParams.q} />
            <select
              name="department"
              defaultValue={searchParams.department ?? ""}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
            >
              <option value="">Todos los departamentos</option>
              {LINGUAMEETING_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={searchParams.status ?? ""}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="on_leave">De baja</option>
              <option value="inactive">Inactivo</option>
            </select>
            <select
              name="emp_type"
              defaultValue={searchParams.emp_type ?? ""}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
            >
              <option value="">Tipo de empleado</option>
              <option value="full_time">Full time</option>
              <option value="part_time">Part time</option>
              <option value="hourly">Por horas</option>
            </select>
            <select
              name="profile_role"
              defaultValue={searchParams.profile_role ?? ""}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
            >
              <option value="">Tipo de usuario</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="employee">Empleado</option>
            </select>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Filtrar</Button>
              {isAdmin ? (
                <Link href="/employees/new">
                  <Button variant="secondary">Nuevo</Button>
                </Link>
              ) : null}
            </div>
          </form>
        </Card>

        <Table>
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Empleado</th>
                <th className="px-4 py-3 font-medium">Departamento</th>
                <th className="px-4 py-3 font-medium">Cargo</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Salario actual</th>
                {canOpenPortals ? <th className="px-4 py-3 font-medium">Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-t border-zinc-200">
                  <td className="px-4 py-3">
                    <Link href={`/employees/${employee.id}`} className="font-medium text-zinc-900 hover:text-lm-aqua">
                      {employee.full_name}
                    </Link>
                    <p className="text-xs text-zinc-500">{employee.email}</p>
                  </td>
                  <td className="px-4 py-3">{employee.department}</td>
                  <td className="px-4 py-3">{employee.job_title}</td>
                  <td className="px-4 py-3">
                    <Badge variant={employee.employment_status === "active" ? "success" : "warning"}>
                      {employmentStatusLabel[employee.employment_status] ?? employee.employment_status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrency(employee.current_salary_amount, employee.current_salary_currency)}
                  </td>
                  {canOpenPortals ? (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isAdmin ? (
                          <Link
                            href={`/employees/${employee.id}/edit`}
                            className="inline-flex h-8 items-center rounded-full bg-white px-3 text-xs font-semibold text-lm-dark-teal ring-1 ring-lm-aqua/30 transition hover:bg-lm-sky"
                          >
                            Editar
                          </Link>
                        ) : null}
                        {isAdmin || employee.id !== currentEmployee?.id ? (
                          <form action={startViewAsAction}>
                            <input type="hidden" name="employee_id" value={employee.id} />
                            <button
                              type="submit"
                              className="inline-flex h-8 items-center rounded-full bg-lm-dark-teal px-3 text-xs font-semibold text-white transition hover:bg-lm-aqua-dark"
                            >
                              Ver portal
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationBar pathname="/employees" query={listQuery} page={safePage} pageSize={pageSize} total={total} />
        </Table>
      </div>
    </div>
  );
}
