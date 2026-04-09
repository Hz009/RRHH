import { normalizeOptionalPayrollCurrencyCode, normalizePayrollCurrencyCode } from "@/lib/countries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mockEmployees, mockJobDepartmentHistory, mockSalaryHistory } from "@/lib/mock-data";
import type { Employee, EmployeeFilters, JobDepartmentHistory, SalaryHistory } from "@/types/domain";

type AppRole = "admin" | "manager" | "employee";

export async function getEmployees(filters: EmployeeFilters = {}): Promise<Employee[]> {
  if (!isSupabaseConfigured()) {
    return filterEmployees(mockEmployees, filters);
  }

  const adminSupabase = createSupabaseAdminClient();
  const role = await getCurrentUserRole();
  const currentEmp = role !== "admin" ? await getCurrentEmployee() : null;

  let query = adminSupabase.from("employees").select("*").order("full_name", { ascending: true });

  if (filters.department) query = query.eq("department", filters.department);
  if (filters.status) query = query.eq("employment_status", filters.status as Employee["employment_status"]);
  if (filters.employeeType) {
    query = query.eq("employee_type", filters.employeeType as Employee["employee_type"]);
  }
  if (filters.profileRole) {
    const { data: profs, error: pe } = await adminSupabase.from("profiles").select("email").eq("role", filters.profileRole);
    if (pe) throw new Error(`Error filtrando por rol de usuario: ${pe.message}`);
    const emails = [...new Set((profs ?? []).map((p) => String(p.email).toLowerCase()))];
    if (emails.length === 0) return [];
    query = query.in("email", emails);
  }
  if (filters.query) query = query.or(`full_name.ilike.%${filters.query}%,email.ilike.%${filters.query}%`);

  const { data, error } = await query;
  if (error) throw new Error(`Error loading employees: ${error.message}`);

  const allEmployees = data ?? [];

  if (role === "admin") return allEmployees;

  if (role === "manager" && currentEmp) {
    return allEmployees.filter(
      (e) => e.id === currentEmp.id || e.manager_id === currentEmp.id
    );
  }

  if (currentEmp) {
    return allEmployees.filter((e) => e.id === currentEmp.id);
  }

  return [];
}

const DEFAULT_EMPLOYEES_PAGE_SIZE = 10;

export async function getEmployeesPaged(
  filters: EmployeeFilters = {}
): Promise<{ employees: Employee[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? DEFAULT_EMPLOYEES_PAGE_SIZE));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const filterRest: EmployeeFilters = {
    query: filters.query,
    department: filters.department,
    status: filters.status,
    employeeType: filters.employeeType,
    profileRole: filters.profileRole,
  };

  if (!isSupabaseConfigured()) {
    let list = filterEmployees(mockEmployees, filterRest);
    list = [...list].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const total = list.length;
    const employees = list.slice(from, from + pageSize);
    return { employees, total, page, pageSize };
  }

  const adminSupabase = createSupabaseAdminClient();
  const role = await getCurrentUserRole();
  const currentEmp = role !== "admin" ? await getCurrentEmployee() : null;

  if (role === "manager" && !currentEmp) {
    return { employees: [], total: 0, page, pageSize };
  }

  let query = adminSupabase
    .from("employees")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filterRest.department) query = query.eq("department", filterRest.department);
  if (filterRest.status) query = query.eq("employment_status", filterRest.status as Employee["employment_status"]);
  if (filterRest.employeeType) {
    query = query.eq("employee_type", filterRest.employeeType as Employee["employee_type"]);
  }
  if (filterRest.profileRole) {
    const { data: profs, error: pe } = await adminSupabase.from("profiles").select("email").eq("role", filterRest.profileRole);
    if (pe) throw new Error(`Error filtrando por rol de usuario: ${pe.message}`);
    const emails = [...new Set((profs ?? []).map((p) => String(p.email).toLowerCase()))];
    if (emails.length === 0) {
      return { employees: [], total: 0, page, pageSize };
    }
    query = query.in("email", emails);
  }
  if (filterRest.query) query = query.or(`full_name.ilike.%${filterRest.query}%,email.ilike.%${filterRest.query}%`);

  if (role === "manager" && currentEmp) {
    query = query.or(`id.eq.${currentEmp.id},manager_id.eq.${currentEmp.id}`);
  } else if (role === "employee") {
    if (!currentEmp) {
      return { employees: [], total: 0, page, pageSize };
    }
    query = query.eq("id", currentEmp.id);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(`Error loading employees: ${error.message}`);

  return {
    employees: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  if (!isSupabaseConfigured()) {
    return mockEmployees.find((employee) => employee.id === id) ?? null;
  }

  const adminSupabase = createSupabaseAdminClient();
  const { data, error } = await adminSupabase.from("employees").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}

export async function getCurrentUserRole(): Promise<AppRole> {
  if (!isSupabaseConfigured()) return "admin";

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "employee";

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role === "admin" || profile?.role === "manager" || profile?.role === "employee") {
    return profile.role;
  }
  return "employee";
}

export async function getCurrentEmployee(): Promise<
  Pick<
    Employee,
    | "id"
    | "full_name"
    | "email"
    | "manager_id"
    | "department"
    | "job_title"
    | "vacation_days_per_year"
    | "residence_country"
    | "employee_type"
    | "hourly_hours_source"
  > | null
> {
  if (!isSupabaseConfigured()) {
    return mockEmployees[0] ?? null;
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const adminSupabase = createSupabaseAdminClient();
  const { data, error } = await adminSupabase
    .from("employees")
    .select(
      "id,full_name,email,manager_id,department,job_title,vacation_days_per_year,residence_country,employee_type,hourly_hours_source"
    )
    .eq("email", user.email.toLowerCase())
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function getNextEmployeeCode(): Promise<string> {
  if (!isSupabaseConfigured()) {
    return getNextMockEmployeeCode();
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select("employee_code")
    .order("employee_code", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Error generating employee code: ${error.message}`);
  const maxCode = Number(data?.employee_code ?? 0);
  return String((Number.isNaN(maxCode) ? 0 : maxCode) + 1).padStart(10, "0");
}

export async function getManagerOptions(): Promise<Array<Pick<Employee, "id" | "full_name" | "email">>> {
  if (!isSupabaseConfigured()) {
    return mockEmployees.filter((employee) => employee.id === "emp-1").map(({ id, full_name, email }) => ({ id, full_name, email }));
  }

  const supabase = createSupabaseServerClient();
  const [{ data: profiles, error: profilesError }, { data: employees, error: employeesError }] = await Promise.all([
    supabase.from("profiles").select("email").eq("role", "manager"),
    supabase.from("employees").select("id,full_name,email").order("full_name", { ascending: true }),
  ]);

  if (profilesError) throw new Error(`Error loading managers: ${profilesError.message}`);
  if (employeesError) throw new Error(`Error loading employees: ${employeesError.message}`);

  const managerEmails = new Set((profiles ?? []).map((profile) => String(profile.email).toLowerCase()));
  return (employees ?? []).filter((employee) => managerEmails.has(String(employee.email).toLowerCase()));
}

export async function getProfileRoleByEmail(email: string): Promise<"admin" | "manager" | "employee"> {
  if (!isSupabaseConfigured()) return "employee";

  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("role").eq("email", email.toLowerCase()).maybeSingle();
  if (data?.role === "admin" || data?.role === "manager" || data?.role === "employee") {
    return data.role;
  }
  return "employee";
}

export async function createEmployee(input: Record<string, unknown>) {
  const parsedPayload = parseEmployeeInput(input, { includeEmployeeCode: false });
  const payload = {
    ...parsedPayload,
    current_salary_effective_date:
      parsedPayload.current_salary_effective_date ?? parsedPayload.hire_date,
  };
  if (
    payload.current_salary_effective_date &&
    payload.current_salary_effective_date < payload.hire_date
  ) {
    throw new Error("La fecha de salario actual no puede ser anterior a la fecha de contratacion.");
  }
  const desiredUserRole = getDesiredUserRole(input.user_role);

  if (!isSupabaseConfigured()) {
    const nextCode = getNextMockEmployeeCode();
    return {
      id: `mock-${Date.now()}`,
      employee_code: nextCode,
      ...payload,
      current_salary_amount: payload.current_salary_amount ?? 0,
      current_salary_currency: payload.current_salary_currency ?? "USD",
      current_salary_effective_date: payload.current_salary_effective_date ?? null,
    };
  }

  const supabase = createSupabaseServerClient();
  const user = await requireAdminUser();

  const { data: existing } = await supabase
    .from("employees")
    .select("id")
    .eq("email", payload.email)
    .maybeSingle();

  if (existing) {
    throw new Error("Ya existe un empleado con ese email. Usa un email diferente.");
  }

  const { data, error } = await supabase.from("employees").insert(payload).select("*").single();
  if (error) throw new Error(`Error creating employee: ${error.message}`);

  await createAuthUserForEmployee(data.email, data.full_name, desiredUserRole);

  if (Number(data.current_salary_amount) > 0) {
    await supabase.from("salary_history").insert({
      employee_id: data.id,
      amount: data.current_salary_amount,
      currency: data.current_salary_currency,
      effective_date: data.current_salary_effective_date ?? data.hire_date,
      reason: "Initial salary from employee creation",
      created_by: user.id,
    });
  }

  await supabase.from("job_department_history").insert({
    employee_id: data.id,
    department: data.department,
    job_title: data.job_title,
    effective_date: data.hire_date,
    reason: "Initial assignment",
    created_by: user.id,
  });

  await supabase.from("employee_compensation_history").insert({
    employee_id: data.id,
    effective_date: data.current_salary_effective_date ?? data.hire_date,
    employee_type: data.employee_type,
    payment_method: data.payment_method,
    payment_account: data.payment_account,
    amount: data.current_salary_amount,
    currency: data.current_salary_currency,
    created_by: user.id,
  });

  return data;
}

export async function updateEmployee(id: string, input: Record<string, unknown>) {
  const payload = parseEmployeeInput(input, { includeEmployeeCode: false });
  if (
    payload.current_salary_effective_date &&
    payload.current_salary_effective_date < payload.hire_date
  ) {
    throw new Error("La fecha de salario actual no puede ser anterior a la fecha de contratacion.");
  }
  const desiredUserRole = getDesiredUserRole(input.user_role);

  if (!isSupabaseConfigured()) {
    return { id, ...payload };
  }

  const supabase = createSupabaseServerClient();
  const user = await requireAdminUser();
  const { data: previousEmployee, error: previousError } = await supabase.from("employees").select("*").eq("id", id).single();
  if (previousError) throw new Error(`Error loading previous employee data: ${previousError.message}`);

  const nextCompSnapshot = { ...previousEmployee, ...payload } as Employee;
  const compensationFieldsChanged =
    String(previousEmployee.employee_type ?? "") !== String(payload.employee_type ?? "") ||
    String(previousEmployee.payment_method ?? "") !== String(payload.payment_method ?? "") ||
    String(previousEmployee.payment_account ?? "") !== String(payload.payment_account ?? "") ||
    Number(previousEmployee.current_salary_amount ?? 0) !== Number(payload.current_salary_amount ?? 0) ||
    String(previousEmployee.current_salary_currency ?? "") !== String(payload.current_salary_currency ?? "") ||
    bankOrPaymentExtrasChanged(previousEmployee, nextCompSnapshot);

  if (
    compensationFieldsChanged &&
    payload.current_salary_effective_date &&
    previousEmployee.current_salary_effective_date &&
    payload.current_salary_effective_date <= previousEmployee.current_salary_effective_date
  ) {
    throw new Error(
      "Cuando cambias tipo de empleado o salario, la fecha de salario actual debe ser posterior a la fecha efectiva anterior."
    );
  }

  const { data, error } = await supabase.from("employees").update(payload).eq("id", id).select("*").single();
  if (error) throw new Error(`Error updating employee: ${error.message}`);
  await syncProfileRoleForEmployee({
    previousEmail: previousEmployee.email,
    nextEmail: data.email,
    fullName: data.full_name,
    role: desiredUserRole,
  });

  const hasSalaryChanged =
    Number(previousEmployee.current_salary_amount) !== Number(data.current_salary_amount) ||
    String(previousEmployee.current_salary_currency) !== String(data.current_salary_currency) ||
    String(previousEmployee.current_salary_effective_date ?? "") !== String(data.current_salary_effective_date ?? "");

  if (hasSalaryChanged && Number(data.current_salary_amount) > 0) {
    await supabase.from("salary_history").insert({
      employee_id: data.id,
      amount: data.current_salary_amount,
      currency: data.current_salary_currency,
      effective_date: data.current_salary_effective_date ?? getTodayDate(),
      reason: "Updated from employee edit",
      created_by: user.id,
    });
    await syncEmployeeCurrentSalaryFromHistory(data.id);
  }

  const hasJobOrDepartmentChanged =
    String(previousEmployee.department) !== String(data.department) ||
    String(previousEmployee.job_title) !== String(data.job_title);

  if (hasJobOrDepartmentChanged) {
    await supabase.from("job_department_history").insert({
      employee_id: data.id,
      department: data.department,
      job_title: data.job_title,
      effective_date: getTodayDate(),
      reason: "Updated from employee edit",
      created_by: user.id,
    });
  }

  const hasCompensationChanged =
    String(previousEmployee.employee_type ?? "") !== String(data.employee_type ?? "") ||
    String(previousEmployee.payment_method ?? "") !== String(data.payment_method ?? "") ||
    String(previousEmployee.payment_account ?? "") !== String(data.payment_account ?? "") ||
    Number(previousEmployee.current_salary_amount ?? 0) !== Number(data.current_salary_amount ?? 0) ||
    String(previousEmployee.current_salary_currency ?? "") !== String(data.current_salary_currency ?? "") ||
    String(previousEmployee.current_salary_effective_date ?? "") !==
      String(data.current_salary_effective_date ?? "") ||
    bankOrPaymentExtrasChanged(previousEmployee, data);

  if (hasCompensationChanged) {
    await supabase.from("employee_compensation_history").insert({
      employee_id: data.id,
      effective_date: data.current_salary_effective_date ?? getTodayDate(),
      employee_type: data.employee_type,
      payment_method: data.payment_method,
      payment_account: data.payment_account,
      amount: data.current_salary_amount,
      currency: data.current_salary_currency,
      created_by: user.id,
    });
  }

  return data;
}

export async function getSalaryHistory(employeeId: string): Promise<SalaryHistory[]> {
  if (!isSupabaseConfigured()) {
    return mockSalaryHistory
      .filter((row) => row.employee_id === employeeId)
      .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("salary_history")
    .select("*")
    .eq("employee_id", employeeId)
    .order("effective_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Error loading salary history: ${error.message}`);
  return data ?? [];
}

export async function addSalaryRecord(input: Record<string, unknown>) {
  const employee_id = String(input.employee_id);
  const amount = Number(input.amount);
  const effective_date = String(input.effective_date);
  const currency = normalizePayrollCurrencyCode(input.currency);
  const reason = input.reason ? String(input.reason) : null;

  if (!employee_id || Number.isNaN(amount) || amount <= 0 || !effective_date) {
    throw new Error("Invalid salary record data");
  }
  await ensureDateOnOrAfterHireDate(employee_id, effective_date, "salario");

  if (!isSupabaseConfigured()) {
    return {
      id: `mock-sal-${Date.now()}`,
      employee_id,
      amount,
      currency,
      effective_date,
      reason,
      created_by: null,
      created_at: new Date().toISOString(),
    };
  }

  const supabase = createSupabaseServerClient();
  const user = await requireAdminUser();
  const { data, error } = await supabase
    .from("salary_history")
    .insert({ employee_id, amount, effective_date, currency, reason })
    .select("*")
    .single();

  if (error) throw new Error(`Error adding salary record: ${error.message}`);
  await syncEmployeeCurrentSalaryFromHistory(employee_id);
  await appendCompensationHistoryForSalary(employee_id, effective_date, amount, currency, user.id);

  return data;
}

export async function updateSalaryRecord(input: Record<string, unknown>) {
  const id = String(input.id ?? "");
  const employee_id = String(input.employee_id ?? "");
  const amount = Number(input.amount);
  const effective_date = String(input.effective_date ?? "");
  const currency = normalizePayrollCurrencyCode(input.currency);
  const reason = input.reason ? String(input.reason) : null;

  if (!id || !employee_id || Number.isNaN(amount) || amount <= 0 || !effective_date) {
    throw new Error("Invalid salary record data");
  }
  await ensureDateOnOrAfterHireDate(employee_id, effective_date, "salario");

  if (!isSupabaseConfigured()) {
    return {
      id,
      employee_id,
      amount,
      currency,
      effective_date,
      reason,
      created_by: null,
      created_at: new Date().toISOString(),
    };
  }

  const supabase = createSupabaseServerClient();
  const user = await requireAdminUser();
  const { data: previous, error: prevErr } = await supabase
    .from("salary_history")
    .select("*")
    .eq("id", id)
    .eq("employee_id", employee_id)
    .single();
  if (prevErr) throw new Error(`Error cargando registro salarial: ${prevErr.message}`);

  const { data, error } = await supabase
    .from("salary_history")
    .update({ amount, currency, effective_date, reason })
    .eq("id", id)
    .eq("employee_id", employee_id)
    .select("*")
    .single();

  if (error) throw new Error(`Error updating salary record: ${error.message}`);
  await removeCompensationHistoryMatchingSalary(
    employee_id,
    String(previous.effective_date),
    Number(previous.amount),
    String(previous.currency)
  );
  await syncEmployeeCurrentSalaryFromHistory(employee_id);
  await appendCompensationHistoryForSalary(
    employee_id,
    String(data.effective_date),
    Number(data.amount),
    String(data.currency),
    user.id
  );
  return data;
}

export async function deleteSalaryRecord(input: Record<string, unknown>) {
  const id = String(input.id ?? "");
  const employee_id = String(input.employee_id ?? "");

  if (!id || !employee_id) {
    throw new Error("Invalid salary record data");
  }

  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = createSupabaseServerClient();
  await requireAdminUser();
  const { data: previous, error: loadErr } = await supabase
    .from("salary_history")
    .select("*")
    .eq("id", id)
    .eq("employee_id", employee_id)
    .maybeSingle();
  if (loadErr) throw new Error(`Error cargando registro salarial: ${loadErr.message}`);

  const { error } = await supabase.from("salary_history").delete().eq("id", id).eq("employee_id", employee_id);
  if (error) throw new Error(`Error deleting salary record: ${error.message}`);

  if (previous) {
    await removeCompensationHistoryMatchingSalary(
      employee_id,
      String(previous.effective_date),
      Number(previous.amount),
      String(previous.currency)
    );
  }
  await syncEmployeeCurrentSalaryFromHistory(employee_id);
}

export async function getJobDepartmentHistory(employeeId: string): Promise<JobDepartmentHistory[]> {
  if (!isSupabaseConfigured()) {
    return mockJobDepartmentHistory
      .filter((row) => row.employee_id === employeeId)
      .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("job_department_history")
    .select("*")
    .eq("employee_id", employeeId)
    .order("effective_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Error loading job and department history: ${error.message}`);
  return data ?? [];
}

export async function addJobDepartmentRecord(input: Record<string, unknown>) {
  const employee_id = String(input.employee_id ?? "");
  const department = String(input.department ?? "").trim();
  const job_title = String(input.job_title ?? "").trim();
  const effective_date = String(input.effective_date ?? "");
  const reason = input.reason ? String(input.reason) : null;

  if (!employee_id || !department || !job_title || !effective_date) {
    throw new Error("Invalid job and department record data");
  }
  await ensureDateOnOrAfterHireDate(employee_id, effective_date, "cargo/departamento");

  if (!isSupabaseConfigured()) {
    return {
      id: `mock-job-${Date.now()}`,
      employee_id,
      department,
      job_title,
      effective_date,
      reason,
      created_by: null,
      created_at: new Date().toISOString(),
    };
  }

  const supabase = createSupabaseServerClient();
  const user = await requireAdminUser();
  const { data, error } = await supabase
    .from("job_department_history")
    .insert({
      employee_id,
      department,
      job_title,
      effective_date,
      reason,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Error adding job and department record: ${error.message}`);
  await syncEmployeeDepartmentAndJobFromHistory(employee_id);
  return data;
}

export async function updateJobDepartmentRecord(input: Record<string, unknown>) {
  const id = String(input.id ?? "");
  const employee_id = String(input.employee_id ?? "");
  const department = String(input.department ?? "").trim();
  const job_title = String(input.job_title ?? "").trim();
  const effective_date = String(input.effective_date ?? "");
  const reason = input.reason ? String(input.reason) : null;

  if (!id || !employee_id || !department || !job_title || !effective_date) {
    throw new Error("Invalid job and department record data");
  }
  await ensureDateOnOrAfterHireDate(employee_id, effective_date, "cargo/departamento");

  if (!isSupabaseConfigured()) {
    return {
      id,
      employee_id,
      department,
      job_title,
      effective_date,
      reason,
      created_by: null,
      created_at: new Date().toISOString(),
    };
  }

  const supabase = createSupabaseServerClient();
  await requireAdminUser();
  const { data, error } = await supabase
    .from("job_department_history")
    .update({
      department,
      job_title,
      effective_date,
      reason,
    })
    .eq("id", id)
    .eq("employee_id", employee_id)
    .select("*")
    .single();

  if (error) throw new Error(`Error updating job and department record: ${error.message}`);
  await syncEmployeeDepartmentAndJobFromHistory(employee_id);
  return data;
}

export async function deleteJobDepartmentRecord(input: Record<string, unknown>) {
  const id = String(input.id ?? "");
  const employee_id = String(input.employee_id ?? "");

  if (!id || !employee_id) {
    throw new Error("Invalid job and department record data");
  }

  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = createSupabaseServerClient();
  await requireAdminUser();
  const { error } = await supabase.from("job_department_history").delete().eq("id", id).eq("employee_id", employee_id);
  if (error) throw new Error(`Error deleting job and department record: ${error.message}`);
  await syncEmployeeDepartmentAndJobFromHistory(employee_id);
}

/** Align employee_compensation_history with a salary_history change (portal de pagos usa esta tabla). */
async function appendCompensationHistoryForSalary(
  employeeId: string,
  effectiveDate: string,
  amount: number,
  currency: string,
  createdBy: string
) {
  const supabase = createSupabaseServerClient();
  const { data: emp, error: empErr } = await supabase
    .from("employees")
    .select("employee_type,payment_method,payment_account")
    .eq("id", employeeId)
    .single();
  if (empErr) throw new Error(`Error cargando empleado para compensacion: ${empErr.message}`);

  const { error } = await supabase.from("employee_compensation_history").insert({
    employee_id: employeeId,
    effective_date: effectiveDate,
    employee_type: emp.employee_type,
    payment_method: emp.payment_method,
    payment_account: emp.payment_account,
    amount,
    currency,
    created_by: createdBy,
  });
  if (error) throw new Error(`Error sincronizando compensacion con historial salarial: ${error.message}`);
}

async function removeCompensationHistoryMatchingSalary(
  employeeId: string,
  effectiveDate: string,
  amount: number,
  currency: string
) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("employee_compensation_history")
    .delete()
    .eq("employee_id", employeeId)
    .eq("effective_date", effectiveDate)
    .eq("amount", amount)
    .eq("currency", currency);
  if (error) throw new Error(`Error eliminando compensacion asociada al salario: ${error.message}`);
}

async function syncEmployeeCurrentSalaryFromHistory(employeeId: string) {
  if (!isSupabaseConfigured()) return;

  const supabase = createSupabaseServerClient();
  const { data: latestRecord, error } = await supabase
    .from("salary_history")
    .select("amount,currency,effective_date")
    .eq("employee_id", employeeId)
    .order("effective_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Error syncing employee salary: ${error.message}`);

  const nextAmount = latestRecord?.amount ?? 0;
  const nextCurrency = latestRecord?.currency ?? "USD";
  const nextEffectiveDate = latestRecord?.effective_date ?? null;

  const { error: employeeError } = await supabase
    .from("employees")
    .update({
      current_salary_amount: nextAmount,
      current_salary_currency: nextCurrency,
      current_salary_effective_date: nextEffectiveDate,
    })
    .eq("id", employeeId);

  if (employeeError) throw new Error(`Error updating employee current salary: ${employeeError.message}`);
}

async function syncEmployeeDepartmentAndJobFromHistory(employeeId: string) {
  if (!isSupabaseConfigured()) return;

  const supabase = createSupabaseServerClient();
  const { data: latestRecord, error } = await supabase
    .from("job_department_history")
    .select("department,job_title")
    .eq("employee_id", employeeId)
    .order("effective_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Error syncing employee job and department: ${error.message}`);
  if (!latestRecord) return;

  const { error: employeeError } = await supabase
    .from("employees")
    .update({
      department: latestRecord.department,
      job_title: latestRecord.job_title,
    })
    .eq("id", employeeId);

  if (employeeError) throw new Error(`Error updating employee current job and department: ${employeeError.message}`);
}

async function ensureDateOnOrAfterHireDate(
  employeeId: string,
  effectiveDate: string,
  context: string
) {
  if (!isSupabaseConfigured()) return;
  if (!employeeId || !effectiveDate) return;

  const adminSupabase = createSupabaseAdminClient();
  const { data: employee, error } = await adminSupabase
    .from("employees")
    .select("hire_date")
    .eq("id", employeeId)
    .maybeSingle();

  if (error) throw new Error(`Error validating hire date: ${error.message}`);
  if (!employee?.hire_date) return;

  if (effectiveDate < employee.hire_date) {
    throw new Error(
      `No se puede registrar ${context} antes de la fecha de contratacion (${employee.hire_date}).`
    );
  }
}

const MOCK_PROFILE_ROLE_BY_EMAIL: Record<string, "admin" | "manager" | "employee"> = {
  "ana.torres@linguameeting.com": "manager",
  "carlos.medina@linguameeting.com": "employee",
};

function optStr(input: Record<string, unknown>, key: string): string | null {
  const v = input[key];
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function bankOrPaymentExtrasChanged(prev: Employee, next: Employee): boolean {
  return (
    String(prev.bank_name ?? "") !== String(next.bank_name ?? "") ||
    String(prev.bank_account_number ?? "") !== String(next.bank_account_number ?? "") ||
    String(prev.swift_bic ?? "") !== String(next.swift_bic ?? "") ||
    String(prev.bank_route_number ?? "") !== String(next.bank_route_number ?? "") ||
    String(prev.paypal_email ?? "") !== String(next.paypal_email ?? "") ||
    String(prev.invoice_currency ?? "") !== String(next.invoice_currency ?? "")
  );
}

function filterEmployees(employees: Employee[], filters: EmployeeFilters) {
  return employees.filter((employee) => {
    if (filters.department && employee.department !== filters.department) return false;
    if (filters.status && employee.employment_status !== filters.status) return false;
    if (filters.employeeType && employee.employee_type !== filters.employeeType) return false;
    if (filters.profileRole) {
      const r = MOCK_PROFILE_ROLE_BY_EMAIL[employee.email.toLowerCase()] ?? "employee";
      if (r !== filters.profileRole) return false;
    }
    if (filters.query) {
      const q = filters.query.toLowerCase();
      if (!employee.full_name.toLowerCase().includes(q) && !employee.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function parseEmployeeInput(input: Record<string, unknown>, options: { includeEmployeeCode: boolean }) {
  const employee_code = String(input.employee_code || "").trim();
  const first_name = String(input.first_name || "").trim();
  const last_name = String(input.last_name || "").trim();
  const full_name = `${first_name} ${last_name}`.trim();
  const email = String(input.email || "").trim().toLowerCase();
  const phone = input.phone ? String(input.phone).trim() : null;
  const nationality = optStr(input, "nationality");
  const residence_country = optStr(input, "residence_country");
  const legal_name_bank = optStr(input, "legal_name_bank");
  const identity_document = optStr(input, "identity_document");
  const address_line = optStr(input, "address_line");
  const address_country = optStr(input, "address_country");
  const address_city = optStr(input, "address_city");
  const address_postal_code = optStr(input, "address_postal_code");
  const bank_name = optStr(input, "bank_name");
  const bank_account_number = optStr(input, "bank_account_number");
  const swift_bic = optStr(input, "swift_bic");
  const bank_route_number = optStr(input, "bank_route_number");
  const paypal_email = optStr(input, "paypal_email");
  const invoice_currency = normalizeOptionalPayrollCurrencyCode(input.invoice_currency);
  const wise_account = optStr(input, "wise_account");

  const employee_type =
    String(input.employee_type || "full_time") === "part_time"
      ? "part_time"
      : String(input.employee_type || "full_time") === "hourly"
        ? "hourly"
        : "full_time";
  const hourly_hours_source =
    employee_type === "hourly"
      ? String(input.hourly_hours_source || "manual_monthly") === "punch"
        ? "punch"
        : "manual_monthly"
      : null;
  const payment_method =
    String(input.payment_method || "bank") === "paypal"
      ? "paypal"
      : String(input.payment_method || "bank") === "wise"
        ? "wise"
        : "bank";

  let payment_account: string | null = null;
  if (payment_method === "paypal") payment_account = paypal_email;
  else if (payment_method === "bank") payment_account = bank_account_number;
  else payment_account = wise_account;

  const department = String(input.department || "").trim();
  const job_title = String(input.job_title || "").trim();
  const manager_id = input.manager_id ? String(input.manager_id) : null;
  const hire_date = String(input.hire_date || "");
  const employment_status = String(input.employment_status || "active");
  const vacation_days_per_year = Number(input.vacation_days_per_year || 30);
  const notes = input.notes ? String(input.notes).trim() : null;
  const current_salary_amount = Number(input.current_salary_amount || 0);
  const current_salary_currency = normalizePayrollCurrencyCode(input.current_salary_currency);
  const current_salary_effective_date = input.current_salary_effective_date
    ? String(input.current_salary_effective_date)
    : null;

  if (!first_name || !last_name || !email || !department || !job_title || !hire_date) {
    throw new Error("Missing required employee fields");
  }

  const payload = {
    full_name,
    first_name,
    last_name,
    email,
    phone,
    nationality,
    residence_country,
    legal_name_bank,
    identity_document,
    address_line,
    address_country,
    address_city,
    address_postal_code,
    bank_name,
    bank_account_number,
    swift_bic,
    bank_route_number,
    paypal_email,
    invoice_currency,
    employee_type,
    hourly_hours_source,
    payment_method,
    payment_account,
    department,
    job_title,
    manager_id,
    hire_date,
    employment_status,
    vacation_days_per_year,
    notes,
    current_salary_amount,
    current_salary_currency,
    current_salary_effective_date,
  };

  if (options.includeEmployeeCode && employee_code) {
    return { employee_code, ...payload };
  }

  return payload;
}

function getNextMockEmployeeCode() {
  const maxCode = mockEmployees.reduce((max, employee) => {
    const numericCode = Number(employee.employee_code);
    if (Number.isNaN(numericCode)) return max;
    return Math.max(max, numericCode);
  }, 0);

  return String(maxCode + 1).padStart(10, "0");
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function resetEmployeePassword(employeeId: string, newPassword: string, confirmPassword: string) {
  if (newPassword !== confirmPassword) {
    throw new Error("Las contraseñas no coinciden.");
  }
  if (newPassword.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  if (!isSupabaseConfigured()) {
    throw new Error("El cambio de contraseña requiere Supabase configurado.");
  }

  await requireAdminUser();
  const adminSupabase = createSupabaseAdminClient();

  const { data: emp, error: empErr } = await adminSupabase
    .from("employees")
    .select("email")
    .eq("id", employeeId)
    .maybeSingle();
  if (empErr) throw new Error(`Error al buscar empleado: ${empErr.message}`);
  if (!emp?.email) throw new Error("Empleado no encontrado.");

  const email = emp.email.toLowerCase();

  const { data: profile } = await adminSupabase.from("profiles").select("id").eq("email", email).maybeSingle();
  let userId = profile?.id;

  if (!userId) {
    const { data: userList, error: listErr } = await adminSupabase.auth.admin.listUsers();
    if (listErr) throw new Error(`Error al buscar usuario: ${listErr.message}`);
    const match = userList?.users?.find((u) => u.email?.toLowerCase() === email);
    if (!match) {
      throw new Error("No hay usuario de acceso en el sistema con el email de este empleado.");
    }
    userId = match.id;
  }

  const { error: updErr } = await adminSupabase.auth.admin.updateUserById(userId, { password: newPassword });
  if (updErr) throw new Error(updErr.message);
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

  return user;
}

async function createAuthUserForEmployee(
  email: string,
  fullName: string,
  role: "manager" | "employee"
) {
  const adminSupabase = createSupabaseAdminClient();

  const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
  const alreadyExists = existingUsers?.users?.some(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  let authUserId: string;

  if (alreadyExists) {
    const existing = existingUsers!.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )!;
    authUserId = existing.id;
  } else {
    const { data: newUser, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password: "123456",
        email_confirm: true,
        user_metadata: { must_change_password: true },
      });

    if (authError) {
      throw new Error(`Error creating auth user: ${authError.message}`);
    }
    authUserId = newUser.user.id;
  }

  await adminSupabase
    .from("profiles")
    .upsert(
      {
        id: authUserId,
        full_name: fullName,
        email: email.toLowerCase(),
        role: role as never,
      },
      { onConflict: "id" }
    );
}

function getDesiredUserRole(value: unknown): "manager" | "employee" {
  return String(value ?? "employee") === "manager" ? "manager" : "employee";
}

async function syncProfileRoleForEmployee(params: {
  previousEmail: string;
  nextEmail: string;
  fullName: string;
  role: "manager" | "employee";
}) {
  if (!isSupabaseConfigured()) return;

  const adminSupabase = createSupabaseAdminClient();
  const previousEmail = params.previousEmail.toLowerCase();
  const nextEmail = params.nextEmail.toLowerCase();

  let { data: profile } = await adminSupabase
    .from("profiles")
    .select("id,role,email")
    .eq("email", nextEmail)
    .maybeSingle();

  if (!profile && previousEmail !== nextEmail) {
    const { data: fallbackProfile } = await adminSupabase
      .from("profiles")
      .select("id,role,email")
      .eq("email", previousEmail)
      .maybeSingle();
    profile = fallbackProfile ?? null;
  }

  if (!profile) {
    const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
    const authUser = existingUsers?.users?.find(
      (u) =>
        u.email?.toLowerCase() === nextEmail ||
        u.email?.toLowerCase() === previousEmail
    );
    if (authUser) {
      const { error: upsertError } = await adminSupabase.from("profiles").upsert(
        {
          id: authUser.id,
          full_name: params.fullName,
          email: nextEmail,
          role: params.role as never,
        },
        { onConflict: "id" }
      );
      if (upsertError) {
        throw new Error(`Error upserting profile role: ${upsertError.message}`);
      }
    }
    return;
  }

  if (profile.role === "admin") return;

  const nextPayload: { role: "manager" | "employee"; email?: string } = {
    role: params.role,
  };
  if (profile.email?.toLowerCase() !== nextEmail) {
    nextPayload.email = nextEmail;
  }

  const { error } = await adminSupabase
    .from("profiles")
    .update(nextPayload)
    .eq("id", profile.id);
  if (error) throw new Error(`Error updating profile role: ${error.message}`);
}
