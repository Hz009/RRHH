import { cookies } from "next/headers";

export const VIEW_AS_COOKIE = "hr_view_as";

export const VIEW_AS_BLOCK_MESSAGE =
  "Estás en el portal de un empleado. Solo puedes ver.";

export function readViewAsEmployeeId(): string | null {
  try {
    const value = cookies().get(VIEW_AS_COOKIE)?.value?.trim() ?? "";
    return value || null;
  } catch {
    return null;
  }
}
