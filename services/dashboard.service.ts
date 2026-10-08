import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mockDashboardKpis } from "@/lib/mock-data";
import { getCurrentUserRole, getEmployees } from "@/services/employees.service";
import type { DashboardKpis } from "@/types/domain";

export async function getDashboardKpis(): Promise<DashboardKpis> {
  if (!isSupabaseConfigured()) {
    return mockDashboardKpis;
  }

  const role = await getCurrentUserRole();
  if (role !== "admin") {
    const people = await getEmployees();
    const ids = people.map((person) => person.id);
    if (ids.length === 0) {
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        openLoans: 0,
        pendingVacationRequests: 0,
        monthlyPayrollEstimate: 0,
      };
    }

    const admin = createSupabaseAdminClient();
    const [loansResult, vacationResult] = await Promise.all([
      admin.from("employee_loans").select("id", { count: "exact", head: true }).eq("status", "active").in("employee_id", ids),
      admin
        .from("vacation_requests")
        .select("id", { count: "exact", head: true })
        .eq("request_status", "pending")
        .in("employee_id", ids),
    ]);

    return {
      totalEmployees: people.length,
      activeEmployees: people.filter((person) => person.employment_status === "active").length,
      openLoans: loansResult.count ?? 0,
      pendingVacationRequests: vacationResult.count ?? 0,
      monthlyPayrollEstimate: people
        .filter((person) => person.employment_status === "active")
        .reduce((acc, person) => acc + Number(person.current_salary_amount || 0) / 12, 0),
    };
  }

  const supabase = createSupabaseServerClient();
  const people = await getEmployees();

  const [loansResult, vacationResult] = await Promise.all([
    supabase.from("employee_loans").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("vacation_requests").select("id", { count: "exact", head: true }).eq("request_status", "pending"),
  ]);

  return {
    totalEmployees: people.length,
    activeEmployees: people.filter((person) => person.employment_status === "active").length,
    openLoans: loansResult.count ?? 0,
    pendingVacationRequests: vacationResult.count ?? 0,
    monthlyPayrollEstimate: people
      .filter((person) => person.employment_status === "active")
      .reduce((acc, person) => acc + Number(person.current_salary_amount || 0) / 12, 0),
  };
}
