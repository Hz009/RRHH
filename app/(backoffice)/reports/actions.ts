"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { registerMonthlyPayments, upsertMonthlyHours } from "@/services/payments.service";

function reportsRedirectUrl(formData: FormData, month: string, extra: Record<string, string>) {
  const params = new URLSearchParams();
  params.set("month", month);
  const retQs = String(formData.get("ret_qs") ?? "").trim();
  if (retQs) {
    new URLSearchParams(retQs).forEach((value, key) => {
      params.set(key, value);
    });
  }
  for (const [key, value] of Object.entries(extra)) {
    params.set(key, value);
  }
  return `/reports?${params.toString()}`;
}

export async function upsertMonthlyHoursAction(formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  const periodMonth = String(payload.period_month ?? "");
  await upsertMonthlyHours(payload);
  revalidatePath("/reports");
  redirect(reportsRedirectUrl(formData, periodMonth, { saved: "hours" }));
}

export async function registerMonthlyPaymentsAction(formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  const periodMonth = String(payload.period_month ?? "");
  const selectedEmployeeIds = formData
    .getAll("selected_employee_id")
    .map((value) => String(value))
    .filter(Boolean);
  try {
    await registerMonthlyPayments(periodMonth, selectedEmployeeIds);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error registrando pagos";
    revalidatePath("/reports");
    redirect(reportsRedirectUrl(formData, periodMonth, { error: message }));
  }
  revalidatePath("/reports");
  revalidatePath("/employee-portal");
  redirect(reportsRedirectUrl(formData, periodMonth, { saved: "payments" }));
}
