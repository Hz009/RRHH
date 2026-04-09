"use client";

import { useMemo, useState } from "react";

import { cn, formatCurrency } from "@/lib/utils";
import type { MonthlyPaidByTypeDatum, PayrollChartEmployeeType } from "@/services/payments.service";

const TYPES: { key: PayrollChartEmployeeType; label: string }[] = [
  { key: "full_time", label: "Full time" },
  { key: "part_time", label: "Part time" },
  { key: "hourly", label: "Por horas" },
];

const LM_CURRENCY_SEGMENTS = ["bg-lm-dark-teal", "bg-lm-aqua", "bg-lm-aqua-dark"] as const;

/** Altura fija del area de barras (px); las alturas se calculan en pixeles para reflejar bien la proporcion mes a mes. */
const PLOT_HEIGHT_PX = 176;

function lmSegmentClass(currency: string): string {
  let h = 0;
  for (let i = 0; i < currency.length; i++) h = (h + currency.charCodeAt(i) * (i + 1)) % LM_CURRENCY_SEGMENTS.length;
  return LM_CURRENCY_SEGMENTS[h]!;
}

function sumRecord(rec: Record<string, number>): number {
  return Object.values(rec).reduce((a, b) => a + b, 0);
}

function mergeMonthByCurrency(row: MonthlyPaidByTypeDatum, visible: Set<PayrollChartEmployeeType>): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const key of visible) {
    const slice = row.byType[key];
    for (const [c, v] of Object.entries(slice)) {
      merged[c] = (merged[c] ?? 0) + v;
    }
  }
  return merged;
}

function shortMonthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es", { month: "short", year: "2-digit" });
}

/** Texto numerico legible; compacto si el numero es grande. */
function formatAmountLabel(value: number, currency: string): string {
  try {
    const abs = Math.abs(value);
    if (abs >= 100_000) {
      return new Intl.NumberFormat("es", {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
    }
    return formatCurrency(value, currency);
  } catch {
    return formatCurrency(value, currency);
  }
}

export function MonthlyPayrollByTypeChart({ data }: { data: MonthlyPaidByTypeDatum[] }) {
  const [visible, setVisible] = useState<Set<PayrollChartEmployeeType>>(
    () => new Set(["full_time", "part_time", "hourly"])
  );

  const toggle = (key: PayrollChartEmployeeType) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const perMonth = useMemo(() => {
    return data.map((row) => {
      const byCurrency = mergeMonthByCurrency(row, visible);
      const total = sumRecord(byCurrency);
      const entries = Object.entries(byCurrency).filter(([, v]) => v > 0);
      return { row, byCurrency, total, entries };
    });
  }, [data, visible]);

  const maxVal = useMemo(() => {
    let max = 0;
    for (const { total } of perMonth) {
      if (total > max) max = total;
    }
    return max;
  }, [perMonth]);

  const currenciesInView = useMemo(() => {
    const set = new Set<string>();
    for (const { entries } of perMonth) {
      for (const [c] of entries) set.add(c);
    }
    return [...set].sort();
  }, [perMonth]);

  const hasSelection = visible.size > 0;

  return (
    <div className="rounded-xl border border-lm-aqua/25 bg-lm-sky/40 p-4 sm:p-5">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-lm-dark-teal">Pagos registrados por mes</p>
          <p className="text-[11px] text-zinc-600">
            Ultimos 12 meses. Altura de cada barra proporcional al monto del mes (igual altura solo si el total coincide).
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Tipos de empleado">
          {TYPES.map(({ key, label }) => {
            const on = visible.has(key);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(key)}
                className={cn(
                  "rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition-colors",
                  on
                    ? "border-lm-dark-teal bg-lm-aqua/25 text-lm-dark-teal"
                    : "border-zinc-200 bg-white text-zinc-500 hover:border-lm-aqua/40"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {!hasSelection ? (
        <p className="py-8 text-center text-sm text-zinc-500">Selecciona al menos un tipo para ver el grafico.</p>
      ) : (
        <>
          <div className="flex gap-1.5 border-b border-l border-lm-dark-teal/25 pl-1 pt-2 sm:gap-2">
            {perMonth.map(({ row, total, entries }) => {
              const barPx =
                maxVal > 0 && total > 0 ? Math.max(Math.round((total / maxVal) * PLOT_HEIGHT_PX), 4) : 0;

              const title =
                entries.length === 0
                  ? `${shortMonthLabel(row.periodMonth)}: sin datos`
                  : `${shortMonthLabel(row.periodMonth)}: ${entries.map(([c, v]) => `${c} ${formatCurrency(v, c)}`).join(" · ")}`;

              return (
                <div key={row.periodMonth} className="flex min-w-0 flex-1 flex-col items-center px-0.5">
                  <div
                    className="mb-1 flex min-h-[3rem] w-full max-w-[56px] flex-col items-center justify-end gap-0.5 text-center"
                    title={title}
                  >
                    {entries.length === 0 ? (
                      <span className="text-[10px] font-medium text-zinc-400">—</span>
                    ) : entries.length === 1 ? (
                      <span className="break-words text-[10px] font-semibold leading-tight text-lm-dark-teal sm:text-[11px]">
                        {formatAmountLabel(entries[0]![1], entries[0]![0])}
                      </span>
                    ) : (
                      entries.map(([c, v]) => (
                        <span
                          key={c}
                          className="block w-full break-words text-[9px] font-semibold leading-tight text-lm-dark-teal sm:text-[10px]"
                        >
                          {formatAmountLabel(v, c)}
                        </span>
                      ))
                    )}
                  </div>

                  <div
                    className="flex w-full max-w-[48px] items-end justify-center sm:max-w-[56px]"
                    style={{ height: PLOT_HEIGHT_PX }}
                  >
                    {total > 0 ? (
                      <div
                        className="flex w-full flex-col-reverse overflow-hidden rounded-t-md border border-lm-aqua/40 shadow-sm"
                        style={{ height: barPx, minHeight: 4 }}
                        title={title}
                      >
                        {entries.map(([cur, amt]) => (
                          <div
                            key={cur}
                            style={{ flex: amt }}
                            className={cn("min-h-[2px] w-full", lmSegmentClass(cur))}
                            title={`${cur} ${formatCurrency(amt, cur)}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="h-px w-full bg-lm-aqua/20" aria-hidden />
                    )}
                  </div>

                  <span
                    className="mt-1.5 block w-full truncate text-center text-[10px] leading-tight text-lm-dark-teal/80 sm:text-[11px]"
                    title={row.periodMonth}
                  >
                    {shortMonthLabel(row.periodMonth)}
                  </span>
                </div>
              );
            })}
          </div>

          {currenciesInView.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-lm-dark-teal">
              <span className="font-medium opacity-80">Monedas (tonos marca):</span>
              {currenciesInView.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5">
                  <span
                    className={cn("inline-block h-2.5 w-2.5 rounded-sm shadow-sm", lmSegmentClass(c))}
                    aria-hidden
                  />
                  {c}
                </span>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
