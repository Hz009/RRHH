"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { VIEW_AS_COOKIE } from "@/lib/view-as";

import { createAuditLog } from "@/services/audit.service";
import {
  addJobDepartmentRecord,
  addSalaryRecord,
  createEmployee,
  deleteJobDepartmentRecord,
  canImpersonateEmployee,
  getEmployeeById,
  deleteSalaryRecord,
  resetEmployeePassword,
  setEmployeeLoansAccess,
  updateEmployee,
  updateEmploymentTerms,
  updateDirectReportManager,
  updateOwnEmployeeContact,
  updateJobDepartmentRecord,
  updateSalaryRecord,
} from "@/services/employees.service";

export async function createEmployeeAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  let employee;
  try {
    const payload = Object.fromEntries(formData.entries());
    employee = await createEmployee(payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al crear empleado." };
  }

  await createAuditLog({
    module: "employees",
    action: "create",
    entityName: "employees",
    entityId: employee.id,
    newData: employee,
  });

  revalidatePath("/employees");
  revalidatePath("/dashboard");
  redirect("/employees?saved=create");
}

export async function updateEmployeeAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const payload = Object.fromEntries(formData.entries());
  const id = String(payload.id ?? "");
  if (!id) return { error: "Falta el id del empleado." };

  let employee;
  try {
    employee = await updateEmployee(id, payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al actualizar empleado." };
  }

  await createAuditLog({
    module: "employees",
    action: "update",
    entityName: "employees",
    entityId: id,
    newData: employee,
  });

  revalidatePath("/employees");
  revalidatePath(`/employees/${id}/edit`);
  redirect("/employees?saved=update");
}

export async function updateOwnContactAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  try {
    await updateOwnEmployeeContact(Object.fromEntries(formData.entries()));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudieron guardar tus datos." };
  }

  revalidatePath("/employee-portal");
  revalidatePath("/employee-portal/datos");
  redirect("/employee-portal");
}

export async function updateEmploymentTermsAction(formData: FormData) {
  const employeeId = String(formData.get("employee_id") ?? "");
  try {
    await updateEmploymentTerms(employeeId, Object.fromEntries(formData.entries()));
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo guardar.";
    redirect(`/employees/${employeeId}/job?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath(`/employees/${employeeId}/job`);
  redirect(`/employees/${employeeId}/job?saved=terms`);
}

export async function setEmployeeLoansAccessAction(formData: FormData) {
  const employeeId = String(formData.get("employee_id") ?? "");
  try {
    await setEmployeeLoansAccess(employeeId, formData.get("loans_enabled") === "on");
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo guardar el acceso a prestamos.";
    redirect(`/employees/${employeeId}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/employees/${employeeId}`);
  redirect(`/employees/${employeeId}?saved=loans`);
}

export async function updateDirectReportManagerAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const employeeId = String(formData.get("employee_id") ?? "");
  const managerId = String(formData.get("manager_id") ?? "");
  try {
    await updateDirectReportManager(employeeId, managerId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo cambiar el manager." };
  }

  revalidatePath(`/employees/${employeeId}`);
  redirect(`/employees/${employeeId}`);
}

export async function resetEmployeePasswordAction(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const employeeId = String(formData.get("employee_id") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  if (!employeeId) return { error: "Falta el identificador del empleado." };

  try {
    await resetEmployeePassword(employeeId, newPassword, confirmPassword);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo actualizar la contraseña." };
  }

  revalidatePath(`/employees/${employeeId}/edit`);
  revalidatePath("/employees");
  return { ok: true };
}

async function saveHistoryAction(
  formData: FormData,
  kind: "salary" | "job",
  action: "create" | "update" | "delete",
  saved: string,
  run: (payload: Record<string, unknown>) => Promise<{ id: string } | void>
) {
  const payload = Object.fromEntries(formData.entries());
  const employeeId = String(payload.employee_id ?? "");
  const result = await run(payload);
  const entityName = kind === "salary" ? "salary_history" : "job_department_history";

  await createAuditLog({
    module: entityName,
    action,
    entityName,
    entityId: result?.id ?? String(payload.id ?? "unknown"),
    newData: result ?? payload,
  });

  revalidatePath(`/employees/${employeeId}/${kind}`);
  revalidatePath("/employees");
  redirect(`/employees/${employeeId}/${kind}?saved=${saved}`);
}

export async function addSalaryRecordAction(formData: FormData) {
  return saveHistoryAction(formData, "salary", "create", "salary", addSalaryRecord);
}

export async function updateSalaryRecordAction(formData: FormData) {
  return saveHistoryAction(formData, "salary", "update", "salary_update", updateSalaryRecord);
}

export async function deleteSalaryRecordAction(formData: FormData) {
  return saveHistoryAction(formData, "salary", "delete", "salary_delete", deleteSalaryRecord);
}

export async function addJobDepartmentRecordAction(formData: FormData) {
  return saveHistoryAction(formData, "job", "create", "job", addJobDepartmentRecord);
}

export async function updateJobDepartmentRecordAction(formData: FormData) {
  return saveHistoryAction(formData, "job", "update", "job_update", updateJobDepartmentRecord);
}

export async function deleteJobDepartmentRecordAction(formData: FormData) {
  return saveHistoryAction(formData, "job", "delete", "job_delete", deleteJobDepartmentRecord);
}

export async function startViewAsAction(formData: FormData) {
  const employeeId = String(formData.get("employee_id") ?? "");
  const employee = employeeId ? await getEmployeeById(employeeId) : null;
  if (!employee || !(await canImpersonateEmployee(employee.id))) {
    redirect("/employees");
  }
  cookies().set(VIEW_AS_COOKIE, employee.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/dashboard");
}

export async function stopViewAsAction() {
  cookies().set(VIEW_AS_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  redirect("/dashboard");
}
