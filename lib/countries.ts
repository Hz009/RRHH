import countryOptionsEs from "./country-options-es.json";

export type CountryOption = { value: string; label: string };

/**
 * Países y territorios ISO 3166-1 alpha-2, más Kosovo (XK).
 * Nombres en español, en un orden fijo para que el servidor y el navegador pinten lo mismo.
 */
export function getCountryOptionsEs(): CountryOption[] {
  return countryOptionsEs as CountryOption[];
}

/** Salario / facturas de empleado: solo USD y EUR (ISO 4217). */
export const PAYROLL_CURRENCY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "USD", label: "USD — Dólar estadounidense" },
  { value: "EUR", label: "EUR — Euro" },
];

export function normalizePayrollCurrencyCode(value: unknown): string {
  const u = String(value ?? "USD").trim().toUpperCase();
  if (u === "EUR" || u === "EURO") return "EUR";
  if (u === "USD") return "USD";
  return "USD";
}

export function normalizeOptionalPayrollCurrencyCode(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const u = s.toUpperCase();
  if (u === "EUR" || u === "EURO") return "EUR";
  if (u === "USD") return "USD";
  return null;
}

/** @alias PAYROLL_CURRENCY_OPTIONS */
export const INVOICE_CURRENCY_OPTIONS = PAYROLL_CURRENCY_OPTIONS;

/** Opciones de &lt;select&gt; con valor heredado si en BD había otra moneda. */
export function payrollCurrencySelectOptions(current?: string | null): { value: string; label: string }[] {
  const raw = (current ?? "").trim().toUpperCase();
  const norm = raw === "EURO" ? "EUR" : raw;
  const allowed = new Set(PAYROLL_CURRENCY_OPTIONS.map((o) => o.value));
  if (norm && !allowed.has(norm)) {
    return [{ value: norm, label: `${norm} (dato anterior)` }, ...PAYROLL_CURRENCY_OPTIONS];
  }
  return [...PAYROLL_CURRENCY_OPTIONS];
}

/** Valor válido para `defaultValue` del &lt;select&gt; según opciones generadas. */
export function matchPayrollSelectValue(
  current: string | undefined | null,
  options: ReadonlyArray<{ value: string }>,
  emptyFallback: string
): string {
  const raw = current?.trim();
  if (!raw) return emptyFallback;
  const cur = raw.toUpperCase() === "EURO" ? "EUR" : raw.toUpperCase();
  const keys = new Set(options.map((o) => o.value));
  return keys.has(cur) ? cur : emptyFallback;
}
