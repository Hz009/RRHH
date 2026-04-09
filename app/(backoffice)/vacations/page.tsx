import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { getCurrentEmployee, getCurrentUserRole } from "@/services/employees.service";
import { createVacationRequestAction, updateVacationRequestStatusAction } from "@/app/(backoffice)/vacations/actions";
import { getVacationContext } from "@/services/vacations.service";
import { VacationCalendar } from "@/components/vacations/vacation-calendar";
import { VacationBalancePanel } from "@/components/vacations/vacation-balance-panel";
import { VacationRequestsPanel } from "@/components/vacations/vacation-requests-panel";
import { VacationRequestForm } from "@/components/vacations/vacation-request-form";

export default async function VacationsPage() {
  const year = new Date().getFullYear();
  const [{ employees, requests, summaries, approverNames }, role, currentEmployee] = await Promise.all([
    getVacationContext(year),
    getCurrentUserRole(),
    getCurrentEmployee(),
  ]);

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const canApprove = isAdmin || isManager;
  const canCreateForOthers = isAdmin || isManager;

  const employeeNameById: Record<string, string> = {};
  for (const employee of employees) {
    employeeNameById[employee.id] = employee.full_name;
  }

  const calendarEmployees = employees.map((e) => ({
    id: e.id,
    full_name: e.full_name,
  }));

  const formEmployees = employees.map((e) => ({
    id: e.id,
    full_name: e.full_name,
  }));

  const availableDaysByEmployee: Record<string, number> = {};
  for (const s of summaries) {
    availableDaysByEmployee[s.employeeId] = s.remainingAvailable;
  }

  return (
    <div>
      <Topbar title="Vacaciones y ausencias" subtitle="Solicitudes, aprobaciones, saldos y calendario de vacaciones." />
      <div className="space-y-6 p-6">
        <VacationBalancePanel summaries={summaries} role={role} currentEmployeeId={currentEmployee?.id ?? null} />

        <Card title="Nueva solicitud de vacaciones">
          <VacationRequestForm
            action={createVacationRequestAction}
            employees={formEmployees}
            currentEmployeeId={currentEmployee?.id ?? null}
            currentEmployeeName={currentEmployee?.full_name ?? null}
            canCreateForOthers={canCreateForOthers}
            isAdmin={isAdmin}
            availableDaysByEmployee={availableDaysByEmployee}
          />
        </Card>

        <Card title="Calendario de vacaciones">
          <VacationCalendar requests={requests} employees={calendarEmployees} role={role} currentEmployeeId={currentEmployee?.id ?? null} />
        </Card>

        <VacationRequestsPanel
          requests={requests}
          employeeNameById={employeeNameById}
          approverNames={approverNames}
          canApprove={canApprove}
          updateStatusAction={updateVacationRequestStatusAction}
        />
      </div>
    </div>
  );
}
