import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mockDashboardKpis } from "@/lib/mock-data";
import type { DashboardKpis } from "@/types/domain";

export async function getDashboardKpis(): Promise<DashboardKpis> {
  if (!isSupabaseConfigured()) {
    return mockDashboardKpis;
  }

  const supabase = createSupabaseServerClient();

  const [employeesResult, activeResult, loansResult, vacationResult, payrollResult] = await Promise.all([
    supabase.from("employees").select("id", { count: "exact", head: true }),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("employment_status", "active"),
    supabase.from("employee_loans").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("vacation_requests").select("id", { count: "exact", head: true }).eq("request_status", "pending"),
    supabase.from("employees").select("current_salary_amount").eq("employment_status", "active"),
  ]);

  const monthlyPayrollEstimate = (payrollResult.data ?? []).reduce(
    (acc, row) => acc + Number(row.current_salary_amount || 0) / 12,
    0
  );

  return {
    totalEmployees: employeesResult.count ?? 0,
    activeEmployees: activeResult.count ?? 0,
    openLoans: loansResult.count ?? 0,
    pendingVacationRequests: vacationResult.count ?? 0,
    monthlyPayrollEstimate,
  };
}
