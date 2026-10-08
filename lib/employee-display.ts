export const employeeTypeLabel: Record<string, string> = {
  full_time: "Full time",
  part_time: "Part time",
  hourly: "Hourly",
};

export const paymentMethodLabel: Record<string, string> = {
  bank: "Transferencia bancaria",
  paypal: "PayPal",
  wise: "Wise",
};

export const bankAccountTypeLabel: Record<string, string> = {
  savings: "Cuenta de ahorros",
  checking: "Cuenta corriente",
};

export const employmentStatusLabel: Record<string, string> = {
  active: "Activo",
  on_leave: "De baja",
  inactive: "Inactivo",
};

/** Iniciales para avatar (max 2 caracteres). */
export function employeeInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase() || "?";
}
