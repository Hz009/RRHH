"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createMonthlyBonus, deleteMonthlyBonus, updateMonthlyBonus } from "@/services/bonuses.service";

function bonusPaths(employeeId: string) {
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath(`/employees/${employeeId}/bonuses`);
  revalidatePath("/reports");
  revalidatePath("/employee-portal");
}

export async function createMonthlyBonusAction(formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  const employeeId = String(payload.employee_id ?? "");
  try {
    await createMonthlyBonus(payload);
  } catch (err) {
    redirect(
      `/employees/${employeeId}/bonuses?error=${encodeURIComponent(err instanceof Error ? err.message : "Error al guardar.")}`
    );
  }
  bonusPaths(employeeId);
  redirect(`/employees/${employeeId}/bonuses?saved=create`);
}

export async function updateMonthlyBonusAction(formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  const employeeId = String(payload.employee_id ?? "");
  try {
    await updateMonthlyBonus(payload);
  } catch (err) {
    redirect(
      `/employees/${employeeId}/bonuses?error=${encodeURIComponent(err instanceof Error ? err.message : "Error al actualizar.")}`
    );
  }
  bonusPaths(employeeId);
  redirect(`/employees/${employeeId}/bonuses?saved=update`);
}

export async function deleteMonthlyBonusAction(formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  const employeeId = String(payload.employee_id ?? "");
  try {
    await deleteMonthlyBonus(payload);
  } catch (err) {
    redirect(
      `/employees/${employeeId}/bonuses?error=${encodeURIComponent(err instanceof Error ? err.message : "Error al eliminar.")}`
    );
  }
  bonusPaths(employeeId);
  redirect(`/employees/${employeeId}/bonuses?saved=delete`);
}
