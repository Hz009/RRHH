"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createPayAdjustment, deactivatePayAdjustment } from "@/services/pay-adjustments.service";

function refresh(employeeId: string) {
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath(`/employees/${employeeId}/adjustments`);
  revalidatePath("/reports");
  revalidatePath("/employee-portal");
}

export async function createPayAdjustmentAction(formData: FormData) {
  const employeeId = String(formData.get("employee_id") ?? "");
  try {
    await createPayAdjustment(Object.fromEntries(formData.entries()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar.";
    redirect(`/employees/${employeeId}/adjustments?error=${encodeURIComponent(message)}`);
  }
  refresh(employeeId);
  redirect(`/employees/${employeeId}/adjustments?saved=1`);
}

export async function deactivatePayAdjustmentAction(formData: FormData) {
  const employeeId = String(formData.get("employee_id") ?? "");
  try {
    await deactivatePayAdjustment(Object.fromEntries(formData.entries()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo quitar.";
    redirect(`/employees/${employeeId}/adjustments?error=${encodeURIComponent(message)}`);
  }
  refresh(employeeId);
  redirect(`/employees/${employeeId}/adjustments?saved=1`);
}
