"use server";

import { revalidatePath } from "next/cache";

import {
  adminDeleteAttendanceRecords,
  adminInsertAttendanceEvent,
  adminUpdateAttendanceRecord,
} from "@/services/attendance.service";
import { adminAddFlexHoursLedgerEntry } from "@/services/flex-hours.service";

export async function adminAttendanceEventAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  try {
    await adminInsertAttendanceEvent(Object.fromEntries(formData.entries()));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al guardar fichaje." };
  }
  revalidatePath(`/employees/${formData.get("employee_id")}/time`);
  return {};
}

export async function adminDeleteAttendanceAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const id = String(formData.get("id") ?? "");
  const employeeId = String(formData.get("employee_id") ?? "");
  if (!id) return { error: "Falta el id del registro." };
  try {
    await adminDeleteAttendanceRecords([id]);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al eliminar." };
  }
  revalidatePath(`/employees/${employeeId}/time`);
  return {};
}

/** Elimina entrada y salida del mismo tramo (uno o dos ids). */
export async function adminDeletePunchPairAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const employeeId = String(formData.get("employee_id") ?? "");
  const inId = String(formData.get("clock_in_id") ?? "").trim();
  const outId = String(formData.get("clock_out_id") ?? "").trim();
  const ids = [inId, outId].filter((x) => x.length > 0);
  if (ids.length === 0) return { error: "No hay registros que eliminar." };
  try {
    await adminDeleteAttendanceRecords(ids);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al eliminar." };
  }
  revalidatePath(`/employees/${employeeId}/time`);
  return {};
}

export async function adminUpdateAttendanceAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const employeeId = String(formData.get("employee_id") ?? "");
  try {
    await adminUpdateAttendanceRecord(Object.fromEntries(formData.entries()));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al actualizar fichaje." };
  }
  revalidatePath(`/employees/${employeeId}/time`);
  return {};
}

export async function adminFlexHoursLedgerAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  try {
    await adminAddFlexHoursLedgerEntry(Object.fromEntries(formData.entries()));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al registrar movimiento." };
  }
  revalidatePath(`/employees/${formData.get("employee_id")}/time`);
  return {};
}
