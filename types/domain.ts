import type { Database } from "@/types/database";

export type Employee = Database["public"]["Tables"]["employees"]["Row"];
export type EmployeeInsert = Database["public"]["Tables"]["employees"]["Insert"];
export type SalaryHistory = Database["public"]["Tables"]["salary_history"]["Row"];
export type JobDepartmentHistory = Database["public"]["Tables"]["job_department_history"]["Row"];
export type EmployeeMonthlyHours = Database["public"]["Tables"]["employee_monthly_hours"]["Row"];
export type Loan = Database["public"]["Tables"]["employee_loans"]["Row"];
export type LoanRepayment = Database["public"]["Tables"]["loan_repayments"]["Row"];

export interface DashboardKpis {
  totalEmployees: number;
  activeEmployees: number;
  openLoans: number;
  pendingVacationRequests: number;
  monthlyPayrollEstimate: number;
}

export interface EmployeeFilters {
  query?: string;
  department?: string;
  status?: string;
  /** full_time | part_time | hourly */
  employeeType?: string;
  /** Rol en app (tabla profiles): admin | manager | employee */
  profileRole?: string;
  page?: number;
  pageSize?: number;
}

export interface LoanFilters {
  query?: string;
  status?: string;
}
