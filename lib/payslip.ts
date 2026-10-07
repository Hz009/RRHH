export const INCENTIVE_TYPES = [
  { value: "desempeno", label: "Desempeño" },
  { value: "proyecto", label: "Proyecto" },
  { value: "referido", label: "Referido" },
  { value: "otro", label: "Otro" },
] as const;

export const DISCOUNT_TYPES = [
  { value: "adelanto", label: "Adelanto" },
  { value: "material", label: "Material o equipo" },
  { value: "ajuste", label: "Ajuste" },
  { value: "otro", label: "Otro" },
] as const;

export type PayAdjustmentKind = "incentive" | "discount";
export type PayRecurrence = "once" | "monthly";

export interface PayslipLine {
  label: string;
  comment: string | null;
  amount: number;
}

export function adjustmentTypeLabel(kind: PayAdjustmentKind, value: string) {
  const list = kind === "incentive" ? INCENTIVE_TYPES : DISCOUNT_TYPES;
  return list.find((item) => item.value === value)?.label ?? value;
}

export function recurrenceLabel(value: string) {
  return value === "monthly" ? "Mensual" : "Puntual";
}

export function appliesInMonth(recurrence: string, startMonth: string, periodMonth: string) {
  const start = startMonth.slice(0, 7);
  if (recurrence === "monthly") return start <= periodMonth;
  return start === periodMonth;
}

export function daysInMonth(periodMonth: string) {
  const [year, month] = periodMonth.split("-").map(Number);
  if (!year || !month) return 0;
  return new Date(year, month, 0).getDate();
}

export function periodBounds(periodMonth: string) {
  const [year, month] = periodMonth.split("-").map(Number);
  const start = `${periodMonth}-01`;
  const end = `${periodMonth}-${String(daysInMonth(periodMonth)).padStart(2, "0")}`;
  return { year, month, start, end };
}

export function overlapDays(rangeStart: string, rangeEnd: string, monthStart: string, monthEnd: string) {
  const start = rangeStart > monthStart ? rangeStart : monthStart;
  const end = rangeEnd < monthEnd ? rangeEnd : monthEnd;
  if (end < start) return 0;
  const from = new Date(`${start}T12:00:00`);
  const to = new Date(`${end}T12:00:00`);
  return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
}

export function monthLabel(periodMonth: string) {
  const { year, month } = periodBounds(periodMonth);
  if (!year || !month) return periodMonth;
  return new Intl.DateTimeFormat("es", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function sameCurrency(left: string | null | undefined, right: string) {
  return String(left ?? "").toUpperCase() === right.toUpperCase();
}

export function loanAmountForMonth(input: {
  installmentAmount: number;
  outstandingBalance: number;
  repaidThisMonth: number;
  startDate: string;
  monthEnd: string;
}) {
  if (input.repaidThisMonth > 0) return input.repaidThisMonth;
  if (input.startDate > input.monthEnd || input.outstandingBalance <= 0) return 0;
  return Math.min(input.installmentAmount, input.outstandingBalance);
}
