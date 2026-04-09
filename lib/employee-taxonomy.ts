/** Departamentos permitidos en LinguaMeeting (RRHH). */
export const LINGUAMEETING_DEPARTMENTS = [
  "Coaches",
  "Finanzas",
  "Marketing y Ventas",
  "MyLinguaMeeting",
  "Support",
] as const;

/** Cargos permitidos en LinguaMeeting (RRHH). */
export const LINGUAMEETING_JOB_TITLES = [
  "Asistente",
  "Calidad",
  "Coach",
  "Coordinador",
  "Customer Success",
  "Customer Support",
  "Implementation Specialist",
  "Jefe",
  "Vendedor",
] as const;

export type LinguaMeetingDepartment = (typeof LINGUAMEETING_DEPARTMENTS)[number];
export type LinguaMeetingJobTitle = (typeof LINGUAMEETING_JOB_TITLES)[number];

/**
 * Opciones para un &lt;select&gt;: catálogo en el orden dado, más el valor actual
 * si en BD hay un texto legacy que ya no está en la lista.
 */
export function selectOptionsFromCatalog(catalog: readonly string[], current?: string | null): string[] {
  const cur = current?.trim();
  if (cur && !catalog.includes(cur)) {
    return [cur, ...catalog];
  }
  return [...catalog];
}
