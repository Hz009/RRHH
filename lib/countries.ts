import iso3166Rows from "./iso3166-slim-2.json";

export type CountryOption = { value: string; label: string };

/** Kosovo: código de facto usado por CLDR / Intl; no está en el slim ISO del repo. */
const EXTRA_ALPHA2_CODES = ["XK"] as const;

const MINIMAL_FALLBACK: CountryOption[] = [
  { value: "ES", label: "España" },
  { value: "MX", label: "México" },
  { value: "US", label: "Estados Unidos" },
  { value: "AR", label: "Argentina" },
  { value: "CO", label: "Colombia" },
  { value: "PE", label: "Perú" },
  { value: "CL", label: "Chile" },
  { value: "BR", label: "Brasil" },
  { value: "GB", label: "Reino Unido" },
  { value: "FR", label: "Francia" },
  { value: "DE", label: "Alemania" },
  { value: "IT", label: "Italia" },
  { value: "PT", label: "Portugal" },
  { value: "DO", label: "República Dominicana" },
].sort((a, b) => a.label.localeCompare(b.label, "es"));

let cache: CountryOption[] | null = null;

type IsoSlimRow = { "alpha-2": string };

/**
 * Todos los países y territorios con código ISO 3166-1 alpha-2 asignado (~249),
 * más XK (Kosovo) cuando el motor lo soporta. Etiquetas en español vía `Intl.DisplayNames`.
 */
export function getCountryOptionsEs(): CountryOption[] {
  if (cache) return cache;
  try {
    const rows = iso3166Rows as IsoSlimRow[];
    const codes = new Set(rows.map((r) => r["alpha-2"]));
    for (const c of EXTRA_ALPHA2_CODES) codes.add(c);

    const dn = new Intl.DisplayNames(["es"], { type: "region" });
    const list = [...codes]
      .map((code) => ({ value: code, label: dn.of(code) ?? code }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));

    if (list.length < 200) {
      cache = MINIMAL_FALLBACK;
      return cache;
    }

    cache = list;
    return cache;
  } catch {
    cache = MINIMAL_FALLBACK;
    return cache;
  }
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
