"use server";

import { revalidatePath } from "next/cache";

import { punchSelf } from "@/services/attendance.service";
import type { AttendanceEventType } from "@/types/database";

export async function punchClockAction(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const raw = String(formData.get("event_type") ?? "");
  if (raw !== "clock_in" && raw !== "clock_out") {
    return { error: "Tipo de fichaje no valido." };
  }
  try {
    await punchSelf(raw as AttendanceEventType);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo registrar el fichaje." };
  }
  revalidatePath("/employee-portal");
  revalidatePath("/dashboard");
  return { ok: true };
}
