import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentEmployee, getCurrentUserRole, getEmployees } from "@/services/employees.service";
import type { Database, VacationRequestStatus } from "@/types/database";

type VacationRequest = Database["public"]["Tables"]["vacation_requests"]["Row"];

export interface VacationBalanceSummary {
  employeeId: string;
  employeeName: string;
  annualAllocation: number;
  usedFromCurrentYear: number;
  carryoverFromPreviousYear: number;
  carryoverUsedInJanuary: number;
  lostCarryover: number;
  scheduledDays: number;
  remainingAvailable: number;
}

export async function getVacationContext(year = new Date().getFullYear()) {
  const role = await getCurrentUserRole();
  const employees = await getEmployees();
  const allRequests = await getVacationRequests(year);

  const visibleEmployeeIds = new Set(employees.map((e) => e.id));
  const requests = allRequests.filter((r) => visibleEmployeeIds.has(r.employee_id));

  const summaries = employees.map((employee) =>
    calculateVacationSummary({
      employeeId: employee.id,
      employeeName: employee.full_name,
      annualAllocation: employee.vacation_days_per_year,
      requests,
      year,
    })
  );

  const approverNames = await getApproverNames(requests);

  return { role, employees, requests, summaries, approverNames, year };
}

async function getApproverNames(
  requests: VacationRequest[]
): Promise<Record<string, string>> {
  const approverIds = [
    ...new Set(
      requests
        .map((r) => r.approved_by)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  if (approverIds.length === 0 || !isSupabaseConfigured()) return {};

  const adminSupabase = createSupabaseAdminClient();
  const { data } = await adminSupabase
    .from("profiles")
    .select("id,full_name")
    .in("id", approverIds);

  const map: Record<string, string> = {};
  for (const profile of data ?? []) {
    map[profile.id] = profile.full_name;
  }
  return map;
}

export async function getVacationRequests(year = new Date().getFullYear()): Promise<VacationRequest[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const adminSupabase = createSupabaseAdminClient();
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const { data, error } = await adminSupabase
    .from("vacation_requests")
    .select("*")
    .gte("start_date", start)
    .lte("start_date", end)
    .order("start_date", { ascending: true });

  if (error) throw new Error(`Error loading vacation requests: ${error.message}`);
  return data ?? [];
}

export async function createVacationRequest(input: Record<string, unknown>) {
  const employee_id = String(input.employee_id ?? "");
  const start_date = String(input.start_date ?? "");
  const end_date = String(input.end_date ?? "");
  const reason = input.reason ? String(input.reason) : null;
  const request_status: VacationRequestStatus = "pending";

  if (!employee_id || !start_date || !end_date) {
    throw new Error("Datos incompletos para solicitud de vacaciones.");
  }

  const days_requested = calculateRequestedDays(start_date, end_date);
  if (days_requested <= 0) {
    throw new Error("Rango de fechas invalido para vacaciones.");
  }

  if (!isSupabaseConfigured()) {
    return {
      id: `mock-vac-${Date.now()}`,
      employee_id,
      start_date,
      end_date,
      days_requested,
      request_status,
      reason,
      approved_by: null,
      approved_at: null,
      created_at: new Date().toISOString(),
    };
  }

  const adminSupabase = createSupabaseAdminClient();
  const role = await getCurrentUserRole();
  const currentEmployee = await getCurrentEmployee();

  if (role === "employee" && currentEmployee?.id !== employee_id) {
    throw new Error("No puedes crear solicitudes para otro empleado.");
  }

  const today = new Date().toISOString().slice(0, 10);
  if (role !== "admin" && start_date < today) {
    throw new Error(
      "No puedes solicitar vacaciones con fechas anteriores a hoy. Solo un administrador puede hacerlo."
    );
  }

  const { data: overlapping, error: overlapError } = await adminSupabase
    .from("vacation_requests")
    .select("id, start_date, end_date")
    .eq("employee_id", employee_id)
    .in("request_status", ["pending", "approved"])
    .lte("start_date", end_date)
    .gte("end_date", start_date)
    .limit(1);

  if (overlapError) throw new Error(`Error verificando fechas: ${overlapError.message}`);

  if (overlapping && overlapping.length > 0) {
    const existing = overlapping[0];
    throw new Error(
      `Las fechas se solapan con una solicitud existente (${formatDateShort(existing.start_date)} - ${formatDateShort(existing.end_date)}). Elige un rango diferente.`
    );
  }

  if (end_date < start_date) {
    throw new Error("La fecha de fin no puede ser anterior a la fecha de inicio.");
  }

  const allEmployees = await getEmployees();
  const allRequests = await getVacationRequests(new Date(start_date).getFullYear());
  const employeeData = allEmployees.find((e) => e.id === employee_id);

  if (employeeData) {
    if (start_date < employeeData.hire_date) {
      throw new Error(
        `No se pueden solicitar vacaciones antes de la fecha de contratacion (${employeeData.hire_date}).`
      );
    }

    const summary = calculateVacationSummary({
      employeeId: employee_id,
      employeeName: employeeData.full_name,
      annualAllocation: employeeData.vacation_days_per_year,
      requests: allRequests,
      year: new Date(start_date).getFullYear(),
    });

    if (days_requested > summary.remainingAvailable) {
      throw new Error(
        `El empleado solo tiene ${summary.remainingAvailable} dia(s) disponible(s), pero la solicitud es de ${days_requested} dia(s).`
      );
    }
  }

  const { data, error } = await adminSupabase
    .from("vacation_requests")
    .insert({
      employee_id,
      start_date,
      end_date,
      days_requested,
      request_status,
      reason,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Error creating vacation request: ${error.message}`);
  return data;
}

export async function updateVacationRequestStatus(input: Record<string, unknown>) {
  const id = String(input.id ?? "");
  const status = String(input.status ?? "") as VacationRequestStatus;

  if (!id || !["approved", "rejected", "cancelled"].includes(status)) {
    throw new Error("Estado de solicitud invalido.");
  }

  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();
  const role = await getCurrentUserRole();
  if (role === "employee") {
    throw new Error("Los empleados no pueden aprobar o rechazar solicitudes.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Debes iniciar sesion para actualizar solicitudes.");
  }

  const payload: Database["public"]["Tables"]["vacation_requests"]["Update"] = {
    request_status: status,
    approved_by: status === "approved" || status === "rejected" ? user.id : null,
    approved_at: status === "approved" || status === "rejected" ? new Date().toISOString() : null,
  };

  const { error } = await adminSupabase.from("vacation_requests").update(payload).eq("id", id);
  if (error) throw new Error(`Error updating vacation request: ${error.message}`);
}

function formatDateShort(date: string) {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function calculateRequestedDays(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  if (endDate < startDate) return 0;

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
}

function calculateVacationSummary({
  employeeId,
  employeeName,
  annualAllocation,
  requests,
  year,
}: {
  employeeId: string;
  employeeName: string;
  annualAllocation: number;
  requests: VacationRequest[];
  year: number;
}): VacationBalanceSummary {
  const approvedForEmployee = requests.filter(
    (request) => request.employee_id === employeeId && request.request_status === "approved"
  );
  const approvedCurrentYear = approvedForEmployee.filter((request) => new Date(request.start_date).getFullYear() === year);
  const approvedPreviousYear = approvedForEmployee.filter((request) => new Date(request.start_date).getFullYear() === year - 1);
  const approvedJanuaryCurrentYear = approvedCurrentYear.filter((request) => new Date(request.start_date).getMonth() === 0);

  const usedPrevYear = approvedPreviousYear.reduce((sum, request) => sum + Number(request.days_requested || 0), 0);
  const previousYearUnused = Math.max(annualAllocation - usedPrevYear, 0);

  const januaryRequested = approvedJanuaryCurrentYear.reduce((sum, request) => sum + Number(request.days_requested || 0), 0);
  const carryoverUsedInJanuary = Math.min(previousYearUnused, januaryRequested);
  const lostCarryover = Math.max(previousYearUnused - carryoverUsedInJanuary, 0);

  const pendingForEmployee = requests.filter(
    (request) => request.employee_id === employeeId && request.request_status === "pending"
  );
  const pendingCurrentYear = pendingForEmployee.filter((request) => new Date(request.start_date).getFullYear() === year);
  const scheduledDays = pendingCurrentYear.reduce((sum, request) => sum + Number(request.days_requested || 0), 0);

  const usedCurrentYear = approvedCurrentYear.reduce((sum, request) => sum + Number(request.days_requested || 0), 0);
  const usedFromCurrentAllocation = Math.max(usedCurrentYear - carryoverUsedInJanuary, 0);
  const remainingAvailable = Math.max(annualAllocation - usedFromCurrentAllocation - scheduledDays, 0);

  return {
    employeeId,
    employeeName,
    annualAllocation,
    usedFromCurrentYear: usedFromCurrentAllocation,
    carryoverFromPreviousYear: previousYearUnused,
    carryoverUsedInJanuary,
    lostCarryover,
    scheduledDays,
    remainingAvailable,
  };
}
