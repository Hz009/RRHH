import { notFound, redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { Card, Notice } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { addJobDepartmentRecordAction, deleteJobDepartmentRecordAction, updateEmploymentTermsAction, updateJobDepartmentRecordAction } from "@/app/(backoffice)/employees/actions";
import {
  LINGUAMEETING_DEPARTMENTS,
  LINGUAMEETING_JOB_TITLES,
  selectOptionsFromCatalog,
} from "@/lib/employee-taxonomy";
import { canViewEmployeeRecord, getCurrentEmployee, getCurrentUserRole, getEmployeeById, getJobDepartmentHistory } from "@/services/employees.service";

interface EmployeeJobHistoryPageProps {
  params: {
    id: string;
  };
  searchParams: {
    saved?: string;
    error?: string;
  };
}

export default async function EmployeeJobHistoryPage({ params, searchParams }: EmployeeJobHistoryPageProps) {
  const [employee, history, role, currentEmployee] = await Promise.all([
    getEmployeeById(params.id),
    getJobDepartmentHistory(params.id),
    getCurrentUserRole(),
    getCurrentEmployee(),
  ]);

  if (!employee) notFound();
  if (!(await canViewEmployeeRecord(role, currentEmployee?.id, employee.id))) redirect("/employees");
  const isAdmin = role === "admin";

  const addDeptOptions = selectOptionsFromCatalog(LINGUAMEETING_DEPARTMENTS, employee.department);
  const addJobOptions = selectOptionsFromCatalog(LINGUAMEETING_JOB_TITLES, employee.job_title);

  const selectClass = "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm disabled:opacity-60";

  return (
    <div>
      <Topbar title={`Cargo y departamento: ${employee.full_name}`} subtitle="Historial de cambios de cargo y departamento." />
      <div className="grid gap-6 p-6 lg:grid-cols-3">
        {searchParams.saved === "job" ? <Notice tone="success" className="lg:col-span-3">Se guardo el cambio de cargo y departamento.</Notice> : null}
        {searchParams.saved === "job_update" ? <Notice tone="success" className="lg:col-span-3">Se actualizo el registro de cargo y departamento.</Notice> : null}
        {searchParams.saved === "job_delete" ? <Notice tone="success" className="lg:col-span-3">Se elimino el registro de cargo y departamento.</Notice> : null}
        {searchParams.saved === "terms" ? <Notice tone="success" className="lg:col-span-3">Se actualizo el estado y el tipo de empleado.</Notice> : null}
        {searchParams.error ? <Notice tone="error" className="lg:col-span-3">{searchParams.error}</Notice> : null}

        <Card title="Cargo y departamento actual" className="lg:col-span-1">
          <p className="text-sm text-zinc-600">Departamento actual</p>
          <p className="text-xl font-semibold text-zinc-900">{employee.department}</p>
          <p className="mt-4 text-sm text-zinc-600">Cargo actual</p>
          <p className="text-xl font-semibold text-zinc-900">{employee.job_title}</p>
        </Card>

        {isAdmin ? (
        <Card title="Estado y tipo de empleado" className="lg:col-span-2">
          <form action={updateEmploymentTermsAction} className="grid gap-3 md:grid-cols-3">
            <input type="hidden" name="employee_id" value={employee.id} />
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Estado</label>
              <select name="employment_status" defaultValue={employee.employment_status} className={selectClass}>
                <option value="active">Activo</option>
                <option value="on_leave">De baja</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Tipo de empleado</label>
              <select name="employee_type" defaultValue={employee.employee_type} className={selectClass}>
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="hourly">Por horas</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Horas (solo por horas)</label>
              <select name="hourly_hours_source" defaultValue={employee.hourly_hours_source ?? "manual_monthly"} className={selectClass}>
                <option value="manual_monthly">Horas del mes</option>
                <option value="punch">Marcaje</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <ConfirmSubmitButton type="submit" confirmMessage="Confirma que deseas actualizar el estado y el tipo de empleado.">
                Guardar estado y tipo
              </ConfirmSubmitButton>
            </div>
          </form>
        </Card>
        ) : null}

        {isAdmin ? (
        <Card title="Agregar cambio de cargo y departamento" className="lg:col-span-2">
          <form action={addJobDepartmentRecordAction} className="grid gap-3 md:grid-cols-4">
            <input type="hidden" name="employee_id" value={employee.id} />
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Departamento</label>
              <select
                name="department"
                required
                defaultValue={employee.department}
                disabled={!isAdmin}
                className={selectClass}
              >
                {addDeptOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Cargo</label>
              <select
                name="job_title"
                required
                defaultValue={employee.job_title}
                disabled={!isAdmin}
                className={selectClass}
              >
                {addJobOptions.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Fecha efectiva</label>
              <Input name="effective_date" type="date" required disabled={!isAdmin} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Motivo</label>
              <Input name="reason" placeholder="Promocion, traslado, etc." disabled={!isAdmin} />
            </div>
            {isAdmin ? (
              <div className="md:col-span-4">
                <ConfirmSubmitButton
                  type="submit"
                  confirmMessage="Confirma que deseas guardar este cambio de cargo y departamento."
                >
                  Guardar cambio
                </ConfirmSubmitButton>
              </div>
            ) : null}
          </form>
        </Card>
        ) : null}

        <Card title="Historial de cargo y departamento" className="lg:col-span-3">
          <div className="space-y-3">
            {history.map((record, index) => {
              const isLatestRecord = index === 0;
              const rowDeptOptions = selectOptionsFromCatalog(LINGUAMEETING_DEPARTMENTS, record.department);
              const rowJobOptions = selectOptionsFromCatalog(LINGUAMEETING_JOB_TITLES, record.job_title);
              if (!isAdmin) {
                return (
                  <div key={record.id} className="rounded-lg border border-zinc-200 p-3 text-sm text-lm-dark-teal">
                    <p className="font-semibold">{record.job_title}</p>
                    <p>{record.department}</p>
                    <p className="text-xs text-zinc-500">Desde {record.effective_date}{record.reason ? ` · ${record.reason}` : ""}</p>
                  </div>
                );
              }
              return (
                <form key={record.id} action={updateJobDepartmentRecordAction} className="rounded-lg border border-zinc-200 p-3">
                  <input type="hidden" name="id" value={record.id} />
                  <input type="hidden" name="employee_id" value={employee.id} />
                  <div className="grid gap-3 md:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs text-zinc-700">Departamento</label>
                      <select
                        name="department"
                        required
                        defaultValue={record.department}
                        disabled={!isAdmin || !isLatestRecord}
                        className={selectClass}
                      >
                        {rowDeptOptions.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-zinc-700">Cargo</label>
                      <select
                        name="job_title"
                        required
                        defaultValue={record.job_title}
                        disabled={!isAdmin || !isLatestRecord}
                        className={selectClass}
                      >
                        {rowJobOptions.map((j) => (
                          <option key={j} value={j}>
                            {j}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-zinc-700">Fecha efectiva</label>
                      <Input
                        name="effective_date"
                        type="date"
                        required
                        defaultValue={record.effective_date}
                        disabled={!isAdmin || !isLatestRecord}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-zinc-700">Motivo</label>
                      <Input name="reason" defaultValue={record.reason ?? ""} disabled={!isAdmin || !isLatestRecord} />
                    </div>
                  </div>
                  {isAdmin && isLatestRecord ? (
                    <div className="mt-3 flex justify-end gap-2">
                      <ConfirmSubmitButton
                        type="submit"
                        className="h-8 px-3 text-xs"
                        confirmMessage="Confirma que deseas actualizar este registro."
                      >
                        Guardar cambios
                      </ConfirmSubmitButton>
                      <ConfirmSubmitButton
                        type="submit"
                        formAction={deleteJobDepartmentRecordAction}
                        variant="danger"
                        className="h-8 px-3 text-xs"
                        confirmMessage="Confirma que deseas eliminar este registro."
                      >
                        Eliminar
                      </ConfirmSubmitButton>
                    </div>
                  ) : null}
                </form>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
