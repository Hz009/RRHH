import { notFound } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { Card, Notice } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { addJobDepartmentRecordAction, deleteJobDepartmentRecordAction, updateJobDepartmentRecordAction } from "@/app/(backoffice)/employees/actions";
import {
  LINGUAMEETING_DEPARTMENTS,
  LINGUAMEETING_JOB_TITLES,
  selectOptionsFromCatalog,
} from "@/lib/employee-taxonomy";
import { getCurrentUserRole, getEmployeeById, getJobDepartmentHistory } from "@/services/employees.service";

interface EmployeeJobHistoryPageProps {
  params: {
    id: string;
  };
  searchParams: {
    saved?: string;
  };
}

export default async function EmployeeJobHistoryPage({ params, searchParams }: EmployeeJobHistoryPageProps) {
  const [employee, history, role] = await Promise.all([
    getEmployeeById(params.id),
    getJobDepartmentHistory(params.id),
    getCurrentUserRole(),
  ]);

  if (!employee) notFound();
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

        <Card title="Cargo y departamento actual" className="lg:col-span-1">
          <p className="text-sm text-zinc-600">Departamento actual</p>
          <p className="text-xl font-semibold text-zinc-900">{employee.department}</p>
          <p className="mt-4 text-sm text-zinc-600">Cargo actual</p>
          <p className="text-xl font-semibold text-zinc-900">{employee.job_title}</p>
        </Card>

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

        <Card title="Historial de cargo y departamento" className="lg:col-span-3">
          <div className="space-y-3">
            {history.map((record, index) => {
              const isLatestRecord = index === 0;
              const rowDeptOptions = selectOptionsFromCatalog(LINGUAMEETING_DEPARTMENTS, record.department);
              const rowJobOptions = selectOptionsFromCatalog(LINGUAMEETING_JOB_TITLES, record.job_title);
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
