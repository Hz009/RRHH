/** Suma horas trabajadas a partir de pares clock_in → clock_out (ordenados por tiempo). */
export type PunchEvent = { event_type: string; occurred_at: string };

export function periodMonthUtcRange(periodMonthYmd: string): { startIso: string; endIso: string } {
  const d = String(periodMonthYmd).slice(0, 10);
  const [y, m] = d.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** Día calendario local (YYYY-MM-DD) para agrupar fichajes. */
export function localCalendarDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/** Agrupa por día local; dentro de cada día, más reciente primero. */
export function groupAttendanceByLocalDay<T extends { occurred_at: string }>(
  rows: T[]
): { dayKey: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = localCalendarDayKey(row.occurred_at);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  }
  const keys = [...map.keys()].sort((a, b) => b.localeCompare(a));
  return keys.map((dayKey) => ({ dayKey, items: map.get(dayKey)! }));
}

/** Entradas y salidas del día en orden cronológico (solo clock_in / clock_out). */
export function partitionClockInOut<T extends { event_type: string; occurred_at: string }>(
  items: T[]
): { ins: T[]; outs: T[]; chronological: T[] } {
  const chronological = items
    .filter((r) => r.event_type === "clock_in" || r.event_type === "clock_out")
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
  return {
    chronological,
    ins: chronological.filter((r) => r.event_type === "clock_in"),
    outs: chronological.filter((r) => r.event_type === "clock_out"),
  };
}

/** Tramos entrada→salida (FIFO). Salidas sin entrada o entradas sin salida van aparte. */
export type PunchPairSegment<T extends { id: string; event_type: string; occurred_at: string }> =
  | { kind: "pair"; in: T; out: T }
  | { kind: "open"; in: T }
  | { kind: "orphan_out"; out: T };

export function segmentPunchPairsFifo<T extends { id: string; event_type: string; occurred_at: string }>(
  chronological: T[]
): PunchPairSegment<T>[] {
  const queue: T[] = [];
  const segments: PunchPairSegment<T>[] = [];
  for (const e of chronological) {
    if (e.event_type === "clock_in") {
      queue.push(e);
    } else if (e.event_type === "clock_out") {
      const inn = queue.shift();
      if (inn) {
        segments.push({ kind: "pair", in: inn, out: e });
      } else {
        segments.push({ kind: "orphan_out", out: e });
      }
    }
  }
  for (const inn of queue) {
    segments.push({ kind: "open", in: inn });
  }
  return segments;
}

/** Suma horas de tramos entrada→salida (mismo criterio FIFO que la vista admin). */
export function sumWorkedHoursFromPunchEvents(events: PunchEvent[]): number {
  const sorted = [...events]
    .filter((r) => r.event_type === "clock_in" || r.event_type === "clock_out")
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
  const withIds = sorted.map((e, i) => ({ ...e, id: `p-${i}` }));
  const segments = segmentPunchPairsFifo(withIds);
  let minutes = 0;
  for (const s of segments) {
    if (s.kind === "pair") {
      minutes += (new Date(s.out.occurred_at).getTime() - new Date(s.in.occurred_at).getTime()) / 60000;
    }
  }
  return Math.round((minutes / 60) * 100) / 100;
}
