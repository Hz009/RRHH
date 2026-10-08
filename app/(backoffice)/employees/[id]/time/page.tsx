import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminAddAttendanceForm, AdminDailyAttendanceActions, AdminFlexHoursForm } from "@/components/employees/employee-time-client-forms";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { groupAttendanceByLocalDay, partitionClockInOut, sumWorkedHoursFromPunchEvents } from "@/lib/attendance-hours";
import { formatDateDdMmYyFromYmd, formatTimeLocal, formatWorkedDurationFromHours } from "@/lib/utils";
import { listAttendanceForEmployee } from "@/services/attendance.service";
import { canViewEmployeeRecord, getCurrentEmployee, getCurrentUserRole, getEmployeeById } from "@/services/employees.service";
import { getFlexHoursBalance, listFlexHoursLedger } from "@/services/flex-hours.service";

interface PageProps {
  params: { id: string };
}

export default async function EmployeeTimePage({ params }: PageProps) {
  const [role, currentEmployee, employee] = await Promise.all([
    getCurrentUserRole(),
    getCurrentEmployee(),
    getEmployeeById(params.id),
  ]);

  if (!employee) notFound();

  const canView = await canViewEmployeeRecord(role, currentEmployee?.id, employee.id);

  if (!canView) {
    redirect("/employees");
  }

  const isAdmin = role === "admin";
  const attendance = await listAttendanceForEmployee(employee.id, 100);
  const isHourly = employee.employee_type === "hourly";
  const flexBalance = isHourly ? await getFlexHoursBalance(employee.id) : null;
  const flexLedger = isHourly
      ? await listFlexHoursLedger(employee.id, 50)
      : [];

  const hourlySource = employee.hourly_hours_source ?? "manual_monthly";

  const attendanceByDay = groupAttendanceByLocalDay(attendance);

  return (
    <div>
      <Topbar
        title={`Bolsa de horas: ${employee.full_name}`}
        subtitle="Horas libres y horas que se reponen. Solo para quien trabaja por horas."
      />
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href={`/employees/${employee.id}`} className="rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50">
            Volver al perfil
          </Link>
        </div>

        <Card title="Resumen">
          <dl className="grid gap-2 text-sm md:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Tipo de empleado</dt>
              <dd className="font-medium">{employee.employee_type}</dd>
            </div>
            {employee.employee_type === "hourly" ? (
              <div>
                <dt className="text-zinc-500">Registro de horas</dt>
                <dd className="font-medium">
                  {hourlySource === "punch" ? "Fichaje entrada/salida" : "Horas mensuales (admin)"}
                </dd>
              </div>
            ) : null}
            {flexBalance !== null ? (
              <div>
                <dt className="text-zinc-500">Saldo bolsa de horas</dt>
                <dd className="font-semibold text-lm-dark-teal">{flexBalance.toFixed(2)} h</dd>
              </div>
            ) : null}
          </dl>
        </Card>

        {employee.employee_type === "hourly" ? (
          <Card title="Historial de fichajes">
            {attendance.length === 0 ? (
              <p className="text-sm text-zinc-500">No hay registros.</p>
            ) : (
              <Table>
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50 text-left text-zinc-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">Día</th>
                      <th className="px-3 py-2 font-medium">Entrada</th>
                      <th className="px-3 py-2 font-medium">Salida</th>
                      <th className="px-3 py-2 font-medium">Tiempo trabajado</th>
                      <th className="px-3 py-2 font-medium">Origen</th>
                      {isAdmin ? (
                        <th className="px-3 py-2 text-right font-medium">Acciones</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceByDay.map(({ dayKey, items }) => {
                      const { ins, outs, chronological } = partitionClockInOut(items);
                      const workedHours = sumWorkedHoursFromPunchEvents(chronological);
                      const openShift = ins.length > outs.length;
                      const tiempoTrabajadoText =
                        workedHours > 0
                          ? formatWorkedDurationFromHours(workedHours) +
                            (openShift ? " (+ turno abierto)" : "")
                          : openShift
                            ? "Turno abierto"
                            : "—";

                      const entradaText =
                        ins.length > 0
                          ? ins.map((r) => formatTimeLocal(r.occurred_at)).join(" · ")
                          : "—";
                      const salidaText =
                        outs.length > 0
                          ? outs.map((r) => formatTimeLocal(r.occurred_at)).join(" · ")
                          : "—";
                      const origenText =
                        items.length > 0
                          ? [...new Set(items.map((r) => (r.source?.trim() ? r.source : "—")))].join(" · ")
                          : "—";

                      return (
                        <tr key={dayKey} className="border-t border-zinc-200">
                          <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formatDateDdMmYyFromYmd(dayKey)}</td>
                          <td className="px-3 py-2 tabular-nums text-zinc-800">{entradaText}</td>
                          <td className="px-3 py-2 tabular-nums text-zinc-800">{salidaText}</td>
                          <td className="px-3 py-2 tabular-nums text-zinc-800">{tiempoTrabajadoText}</td>
                          <td className="px-3 py-2 text-zinc-600">{origenText}</td>
                          {isAdmin ? (
                            <td className="px-3 py-2 text-right align-top">
                              <AdminDailyAttendanceActions employeeId={employee.id} items={items} />
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Table>
            )}
            {isAdmin ? (
              <div className="mt-4 border-t border-zinc-100 pt-4">
                <p className="mb-2 text-xs font-medium text-zinc-600">Anadir correccion (admin)</p>
                <AdminAddAttendanceForm employeeId={employee.id} />
              </div>
            ) : null}
          </Card>
        ) : null}

        {isHourly ? (
          <>
            <Card title="Movimientos bolsa de horas (libres / repone)">
              {flexLedger.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin movimientos registrados.</p>
              ) : (
                <Table>
                  <table className="min-w-full text-sm">
                    <thead className="bg-zinc-50 text-left text-zinc-600">
                      <tr>
                        <th className="px-3 py-2 font-medium">Fecha</th>
                        <th className="px-3 py-2 font-medium">Horas</th>
                        <th className="px-3 py-2 font-medium">Tipo</th>
                        <th className="px-3 py-2 font-medium">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flexLedger.map((row) => (
                        <tr key={row.id} className="border-t border-zinc-200">
                          <td className="px-3 py-2">{row.occurred_at}</td>
                          <td className="px-3 py-2 font-medium">{Number(row.delta_hours).toFixed(2)}</td>
                          <td className="px-3 py-2">{row.kind}</td>
                          <td className="px-3 py-2 text-zinc-600">{row.reason ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Table>
              )}
              {isAdmin ? (
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <p className="mb-2 text-xs font-medium text-zinc-600">Nuevo movimiento (admin)</p>
                  <AdminFlexHoursForm employeeId={employee.id} />
                </div>
              ) : (
                <p className="mt-3 text-xs text-zinc-500">Los movimientos solo los registra administracion.</p>
              )}
            </Card>
          </>
        ) : null}

        {employee.employee_type === "hourly" && hourlySource === "manual_monthly" ? (
          <Card title="Horas por mes">
            <p className="text-sm text-zinc-600">
              Las horas de este perfil se cargan en el portal de pagos / reportes (tabla{" "}
              <span className="font-mono text-xs">employee_monthly_hours</span>), no por fichaje.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
