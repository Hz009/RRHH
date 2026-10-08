"use server";

import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/services/audit.service";
import { createVacationRequest, updateVacationRequestStatus } from "@/services/vacations.service";

export async function createVacationRequestAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    const payload = Object.fromEntries(formData.entries());
    const request = await createVacationRequest(payload);
    await createAuditLog({
      module: "vacations",
      action: "create_request",
      entityName: "vacation_requests",
      entityId: request.id,
      newData: request,
    });
    revalidatePath("/vacations");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Error al crear solicitud.",
    };
  }
}

export async function updateVacationRequestStatusAction(formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  await updateVacationRequestStatus(payload);

  await createAuditLog({
    module: "vacations",
    action: `update_request_status_${String(payload.status ?? "")}`,
    entityName: "vacation_requests",
    entityId: String(payload.id ?? "unknown"),
    newData: payload,
  });

  revalidatePath("/vacations");
}
