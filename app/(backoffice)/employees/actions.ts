"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAuditLog } from "@/services/audit.service";
import {
  addJobDepartmentRecord,
  addSalaryRecord,
  createEmployee,
  deleteJobDepartmentRecord,
  deleteSalaryRecord,
  resetEmployeePassword,
  updateEmployee,
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

export async function addSalaryRecordAction(formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  const salaryRecord = await addSalaryRecord(payload);
  const employeeId = String(payload.employee_id ?? "");

  await createAuditLog({
    module: "salary_history",
    action: "create",
    entityName: "salary_history",
    entityId: salaryRecord.id,
    newData: salaryRecord,
  });

  revalidatePath(`/employees/${employeeId}/salary`);
  revalidatePath("/employees");
  redirect(`/employees/${employeeId}/salary?saved=salary`);
}

export async function updateSalaryRecordAction(formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  const salaryRecord = await updateSalaryRecord(payload);
  const employeeId = String(payload.employee_id ?? "");

  await createAuditLog({
    module: "salary_history",
    action: "update",
    entityName: "salary_history",
    entityId: salaryRecord.id,
    newData: salaryRecord,
  });

  revalidatePath(`/employees/${employeeId}/salary`);
  revalidatePath("/employees");
  redirect(`/employees/${employeeId}/salary?saved=salary_update`);
}

export async function deleteSalaryRecordAction(formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  const employeeId = String(payload.employee_id ?? "");
  const salaryRecordId = String(payload.id ?? "unknown");

  await deleteSalaryRecord(payload);

  await createAuditLog({
    module: "salary_history",
    action: "delete",
    entityName: "salary_history",
    entityId: salaryRecordId,
    newData: payload,
  });

  revalidatePath(`/employees/${employeeId}/salary`);
  revalidatePath("/employees");
  redirect(`/employees/${employeeId}/salary?saved=salary_delete`);
}

export async function addJobDepartmentRecordAction(formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  const jobRecord = await addJobDepartmentRecord(payload);
  const employeeId = String(payload.employee_id ?? "");

  await createAuditLog({
    module: "job_department_history",
    action: "create",
    entityName: "job_department_history",
    entityId: jobRecord.id,
    newData: jobRecord,
  });

  revalidatePath(`/employees/${employeeId}/job`);
  revalidatePath("/employees");
  redirect(`/employees/${employeeId}/job?saved=job`);
}

export async function updateJobDepartmentRecordAction(formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  const jobRecord = await updateJobDepartmentRecord(payload);
  const employeeId = String(payload.employee_id ?? "");

  await createAuditLog({
    module: "job_department_history",
    action: "update",
    entityName: "job_department_history",
    entityId: jobRecord.id,
    newData: jobRecord,
  });

  revalidatePath(`/employees/${employeeId}/job`);
  revalidatePath("/employees");
  redirect(`/employees/${employeeId}/job?saved=job_update`);
}

export async function deleteJobDepartmentRecordAction(formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  const employeeId = String(payload.employee_id ?? "");
  const recordId = String(payload.id ?? "unknown");

  await deleteJobDepartmentRecord(payload);

  await createAuditLog({
    module: "job_department_history",
    action: "delete",
    entityName: "job_department_history",
    entityId: recordId,
    newData: payload,
  });

  revalidatePath(`/employees/${employeeId}/job`);
  revalidatePath("/employees");
  redirect(`/employees/${employeeId}/job?saved=job_delete`);
}
