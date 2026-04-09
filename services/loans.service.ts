import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUserRole } from "@/services/employees.service";
import { mockLoanRepayments, mockLoans } from "@/lib/mock-data";
import type { Loan, LoanFilters, LoanRepayment } from "@/types/domain";

export async function getLoans(filters: LoanFilters = {}): Promise<Loan[]> {
  if (!isSupabaseConfigured()) {
    return filterLoans(mockLoans, filters);
  }

  const supabase = createSupabaseServerClient();
  let query = supabase.from("employee_loans").select("*").order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status as Loan["status"]);
  if (filters.query) query = query.ilike("description", `%${filters.query}%`);

  const { data, error } = await query;
  if (error) throw new Error(`Error loading loans: ${error.message}`);
  return data ?? [];
}

export async function createLoan(input: Record<string, unknown>) {
  const employee_id = String(input.employee_id);
  const description = String(input.description || "");
  const principal_amount = Number(input.principal_amount || 0);
  const installments_total = Number(input.installments_total || 0);
  const installment_amount = Number(input.installment_amount || 0);
  const start_date = String(input.start_date || "");
  const currency = String(input.currency || "USD");
  const payroll_deduction_enabled = String(input.payroll_deduction_enabled || "") === "on";
  const payroll_deduction_code = input.payroll_deduction_code ? String(input.payroll_deduction_code) : null;

  if (
    !employee_id ||
    !description ||
    Number.isNaN(principal_amount) ||
    principal_amount <= 0 ||
    !installments_total ||
    !installment_amount ||
    !start_date
  ) {
    throw new Error("Datos de prestamo incompletos.");
  }

  if (!isSupabaseConfigured()) {
    return {
      id: `mock-loan-${Date.now()}`,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      employee_id,
      description,
      principal_amount,
      currency,
      installments_total,
      installments_paid: 0,
      installment_amount,
      start_date,
      payroll_deduction_enabled,
      payroll_deduction_code,
      outstanding_balance: principal_amount,
      status: "draft" as const,
    };
  }

  const role = await getCurrentUserRole();
  const initialStatus = role === "admin" ? "active" : "draft";
  const dbClient = role === "admin" ? createSupabaseServerClient() : createSupabaseAdminClient();

  const { data, error } = await dbClient
    .from("employee_loans")
    .insert({
      employee_id,
      description,
      principal_amount,
      currency,
      installments_total,
      installments_paid: 0,
      installment_amount,
      start_date,
      payroll_deduction_enabled,
      payroll_deduction_code,
      outstanding_balance: principal_amount,
      status: initialStatus,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Error creating loan: ${error.message}`);
  return data;
}

export async function approveLoan(loanId: string) {
  if (!isSupabaseConfigured()) return;

  const supabase = createSupabaseServerClient();
  await requireAdminUser();

  const { error } = await supabase
    .from("employee_loans")
    .update({ status: "active" })
    .eq("id", loanId)
    .eq("status", "draft");

  if (error) throw new Error(`Error al aprobar prestamo: ${error.message}`);
}

export async function rejectLoan(loanId: string) {
  if (!isSupabaseConfigured()) return;

  const supabase = createSupabaseServerClient();
  await requireAdminUser();

  const { error } = await supabase
    .from("employee_loans")
    .update({ status: "cancelled" })
    .eq("id", loanId)
    .eq("status", "draft");

  if (error) throw new Error(`Error al rechazar prestamo: ${error.message}`);
}

export async function getLoanById(loanId: string): Promise<Loan | null> {
  if (!isSupabaseConfigured()) {
    return mockLoans.find((loan) => loan.id === loanId) ?? null;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("employee_loans").select("*").eq("id", loanId).single();
  if (error) return null;
  return data;
}

export async function getLoanRepaymentsByLoanId(loanId: string): Promise<LoanRepayment[]> {
  if (!isSupabaseConfigured()) {
    return mockLoanRepayments
      .filter((repayment) => repayment.loan_id === loanId)
      .sort((a, b) => new Date(b.paid_on).getTime() - new Date(a.paid_on).getTime());
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("loan_repayments")
    .select("*")
    .eq("loan_id", loanId)
    .order("paid_on", { ascending: false });

  if (error) throw new Error(`Error loading loan repayments: ${error.message}`);
  return data ?? [];
}

export async function registerLoanRepayment(input: Record<string, unknown>) {
  const loan_id = String(input.loan_id);
  const employee_id = String(input.employee_id);
  const amount = Number(input.amount || 0);
  const paid_on = String(input.paid_on || "");
  const source = String(input.source || "manual");
  const payroll_period = input.payroll_period ? String(input.payroll_period) : null;
  const note = input.note ? String(input.note) : null;

  if (!loan_id || !employee_id || !paid_on || Number.isNaN(amount) || amount <= 0) {
    throw new Error("Invalid repayment data");
  }

  if (!isSupabaseConfigured()) return;

  const supabase = createSupabaseServerClient();
  await requireAdminUser();
  const { error } = await supabase.from("loan_repayments").insert({
    loan_id,
    employee_id,
    amount,
    paid_on,
    source,
    payroll_period,
    note,
  });
  if (error) throw new Error(`Error registering repayment: ${error.message}`);
}

function filterLoans(loans: Loan[], filters: LoanFilters) {
  return loans.filter((loan) => {
    if (filters.status && loan.status !== filters.status) return false;
    if (filters.query && !loan.description.toLowerCase().includes(filters.query.toLowerCase())) return false;
    return true;
  });
}

async function requireAdminUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Debes iniciar sesion como admin para continuar.");
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") {
    throw new Error("Solo el usuario admin puede realizar esta accion.");
  }
}
