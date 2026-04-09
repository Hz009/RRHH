import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

/** Hora local (es) para marcas de fichaje. */
export function formatTimeLocal(value: string): string {
  return new Intl.DateTimeFormat("es", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/** Valor para input datetime-local desde ISO timestamptz (zona local del navegador). */
export function toDatetimeLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 16);
}

/** YYYY-MM-DD for HTML date inputs from DB date or timestamptz string. */
export function toDateInputValue(value: string): string {
  const s = String(value ?? "");
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : "";
}

/** Format calendar date YYYY-MM-DD without UTC shift (safe for payroll dates). */
export function formatDateOnlyLocal(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
  if (!m) return formatDate(value);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Intl.DateTimeFormat("es", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(y, mo - 1, d));
}

/** Día calendario YYYY-MM-DD → DD/MM/AA (sin corrimiento UTC). */
export function formatDateDdMmYyFromYmd(dayKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dayKey ?? ""));
  if (!m) return formatDate(dayKey);
  const yy = m[1].slice(-2);
  return `${m[3]}/${m[2]}/${yy}`;
}

/** Duración a partir de horas decimales (ej. fichaje: entrada a salida). */
export function formatWorkedDurationFromHours(hours: number): string {
  if (hours <= 0 || Number.isNaN(hours)) return "";
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (min === 0) return `${h} h`;
  return `${h} h ${min} min`;
}
