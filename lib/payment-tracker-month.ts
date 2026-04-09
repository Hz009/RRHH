const MONTH_RE = /^\d{4}-\d{2}$/;

/** Mes por defecto del payment tracker: mes anterior, salvo el último día del mes en curso (entonces mes actual). */
export function getDefaultPaymentTrackerMonth(reference = new Date()): string {
  const y = reference.getFullYear();
  const m = reference.getMonth();
  const day = reference.getDate();
  const lastDayOfMonth = new Date(y, m + 1, 0).getDate();
  if (day === lastDayOfMonth) {
    return `${y}-${String(m + 1).padStart(2, "0")}`;
  }
  const prev = new Date(y, m, 0);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

export function isValidYearMonth(value: string): boolean {
  if (!MONTH_RE.test(value)) return false;
  const [ys, ms] = value.split("-");
  const year = Number(ys);
  const month = Number(ms);
  if (month < 1 || month > 12) return false;
  return year >= 2000 && year <= 2100;
}

export function resolveDashboardPayMonth(raw: string | undefined): string {
  const trimmed = String(raw ?? "").trim();
  if (trimmed && isValidYearMonth(trimmed)) return trimmed;
  return getDefaultPaymentTrackerMonth();
}

export function shiftYearMonth(yyyyMm: string, deltaMonths: number): string {
  const [ys, ms] = yyyyMm.split("-").map(Number);
  const d = new Date(ys, ms - 1 + deltaMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatYearMonthLabel(yyyyMm: string, locale = "es"): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
}
