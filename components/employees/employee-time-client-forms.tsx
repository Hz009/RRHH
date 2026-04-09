"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";

import {
  adminAttendanceEventAction,
  adminDeleteAttendanceAction,
  adminDeletePunchPairAction,
  adminFlexHoursLedgerAction,
  adminUpdateAttendanceAction,
} from "@/app/(backoffice)/employees/[id]/time/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MinimalModal } from "@/components/ui/minimal-modal";
import {
  partitionClockInOut,
  segmentPunchPairsFifo,
  type PunchPairSegment,
} from "@/lib/attendance-hours";
import { formatTimeLocal, toDatetimeLocalInputValue } from "@/lib/utils";
import type { Database } from "@/types/database";

type AttendanceRow = Database["public"]["Tables"]["attendance_records"]["Row"];

const otherEventLabel: Record<string, string> = {
  break_start: "Inicio pausa",
  break_end: "Fin pausa",
};

function AdminPunchSegmentRow({
  employeeId,
  seg,
}: {
  employeeId: string;
  seg: PunchPairSegment<AttendanceRow>;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const summaryShort =
    seg.kind === "pair"
      ? `${formatTimeLocal(seg.in.occurred_at)} – ${formatTimeLocal(seg.out.occurred_at)}`
      : seg.kind === "open"
        ? formatTimeLocal(seg.in.occurred_at)
        : formatTimeLocal(seg.out.occurred_at);

  const clockInId = seg.kind === "orphan_out" ? null : seg.in.id;
  const clockOutId = seg.kind === "open" ? null : seg.out.id;

  const inIso = seg.kind !== "orphan_out" ? seg.in.occurred_at : "";
  const outIso = seg.kind !== "open" ? seg.out.occurred_at : "";

  const [inLocal, setInLocal] = useState("");
  const [outLocal, setOutLocal] = useState("");

  useEffect(() => {
    if (!editOpen) return;
    setError(null);
    if (inIso) setInLocal(toDatetimeLocalInputValue(inIso));
    else setInLocal("");
    if (outIso) setOutLocal(toDatetimeLocalInputValue(outIso));
    else setOutLocal("");
  }, [editOpen, inIso, outIso]);

  function runDelete() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("employee_id", employeeId);
      if (clockInId) fd.set("clock_in_id", clockInId);
      if (clockOutId) fd.set("clock_out_id", clockOutId);
      const res = await adminDeletePunchPairAction(null, fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setDeleteOpen(false);
      router.refresh();
    });
  }

  function runSaveEdits() {
    setError(null);
    startTransition(async () => {
      const updates: { id: string; occurred_at: string }[] = [];
      if (seg.kind !== "orphan_out") {
        const orig = toDatetimeLocalInputValue(seg.in.occurred_at);
        if (inLocal && inLocal !== orig) {
          updates.push({ id: seg.in.id, occurred_at: inLocal });
        }
      }
      if (seg.kind !== "open") {
        const orig = toDatetimeLocalInputValue(seg.out.occurred_at);
        if (outLocal && outLocal !== orig) {
          updates.push({ id: seg.out.id, occurred_at: outLocal });
        }
      }

      if (updates.length === 0) {
        setEditOpen(false);
        return;
      }

      for (const u of updates) {
        const fd = new FormData();
        fd.set("id", u.id);
        fd.set("employee_id", employeeId);
        fd.set("occurred_at", u.occurred_at);
        const res = await adminUpdateAttendanceAction(null, fd);
        if (res?.error) {
          setError(res.error);
          return;
        }
      }
      setEditOpen(false);
      router.refresh();
    });
  }

  const hasPair = Boolean(clockInId && clockOutId);
  const deleteTitle = hasPair ? "Eliminar tramo" : "Eliminar registro";
  const deleteDesc = hasPair
    ? "Se borraran la entrada y la salida de esta pareja. Esta accion no se puede deshacer."
    : "Se borrara esta marca de fichaje. Esta accion no se puede deshacer.";

  const editDescription =
    seg.kind === "pair"
      ? "Ajusta las horas de entrada y de salida."
      : seg.kind === "open"
        ? "Ajusta la hora de entrada (aun no hay salida registrada)."
        : "Ajusta la hora de salida (sin entrada emparejada).";

  return (
    <>
      <div className="flex justify-end py-1">
        <div className="flex shrink-0 items-center gap-0.5">
          <span className="sr-only">Tramo {summaryShort}</span>
          <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-lg px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-100/90 hover:text-zinc-900"
            onClick={() => setEditOpen(true)}
          >
            Modificar
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-lg px-3 text-xs font-medium text-red-600/90 hover:bg-red-50 hover:text-red-700"
            onClick={() => setDeleteOpen(true)}
          >
            Eliminar
          </Button>
        </div>
      </div>

      <MinimalModal
        open={deleteOpen}
        onClose={() => {
          if (!pending) {
            setDeleteOpen(false);
            setError(null);
          }
        }}
        title={deleteTitle}
        description={deleteDesc}
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => {
                setDeleteOpen(false);
                setError(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" variant="danger" className="w-full sm:w-auto" disabled={pending} onClick={runDelete}>
              {pending ? "Eliminando…" : "Eliminar"}
            </Button>
          </>
        }
      >
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </MinimalModal>

      <MinimalModal
        open={editOpen}
        onClose={() => {
          if (!pending) {
            setEditOpen(false);
            setError(null);
          }
        }}
        title="Modificar horario"
        description={editDescription}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => {
                setEditOpen(false);
                setError(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" variant="primary" className="w-full sm:w-auto" disabled={pending} onClick={runSaveEdits}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {seg.kind !== "orphan_out" ? (
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Entrada
              </label>
              <Input
                type="datetime-local"
                value={inLocal}
                onChange={(e) => setInLocal(e.target.value)}
                className="font-mono text-sm tracking-tight"
              />
            </div>
          ) : null}
          {seg.kind !== "open" ? (
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Salida
              </label>
              <Input
                type="datetime-local"
                value={outLocal}
                onChange={(e) => setOutLocal(e.target.value)}
                className="font-mono text-sm tracking-tight"
              />
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </MinimalModal>
    </>
  );
}

function AdminOtherAttendanceRow({ employeeId, row }: { employeeId: string; row: AttendanceRow }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const summaryShort = `${otherEventLabel[row.event_type] ?? row.event_type} · ${formatTimeLocal(row.occurred_at)}`;
  const rowIso = row.occurred_at;
  const [timeLocal, setTimeLocal] = useState("");

  useEffect(() => {
    if (!editOpen) return;
    setError(null);
    setTimeLocal(toDatetimeLocalInputValue(rowIso));
  }, [editOpen, rowIso]);

  function runDelete() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", row.id);
      fd.set("employee_id", employeeId);
      const res = await adminDeleteAttendanceAction(null, fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setDeleteOpen(false);
      router.refresh();
    });
  }

  function runSave() {
    setError(null);
    startTransition(async () => {
      const orig = toDatetimeLocalInputValue(rowIso);
      if (!timeLocal || timeLocal === orig) {
        setEditOpen(false);
        return;
      }
      const fd = new FormData();
      fd.set("id", row.id);
      fd.set("employee_id", employeeId);
      fd.set("occurred_at", timeLocal);
      const res = await adminUpdateAttendanceAction(null, fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setEditOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-end py-1">
        <div className="flex shrink-0 items-center gap-0.5">
          <span className="sr-only">{summaryShort}</span>
          <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-lg px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-100/90 hover:text-zinc-900"
            onClick={() => setEditOpen(true)}
          >
            Modificar
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-lg px-3 text-xs font-medium text-red-600/90 hover:bg-red-50 hover:text-red-700"
            onClick={() => setDeleteOpen(true)}
          >
            Eliminar
          </Button>
        </div>
      </div>

      <MinimalModal
        open={deleteOpen}
        onClose={() => {
          if (!pending) {
            setDeleteOpen(false);
            setError(null);
          }
        }}
        title="Eliminar registro"
        description="Se borrara este registro. Esta accion no se puede deshacer."
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => {
                setDeleteOpen(false);
                setError(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" variant="danger" className="w-full sm:w-auto" disabled={pending} onClick={runDelete}>
              {pending ? "Eliminando…" : "Eliminar"}
            </Button>
          </>
        }
      >
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </MinimalModal>

      <MinimalModal
        open={editOpen}
        onClose={() => {
          if (!pending) {
            setEditOpen(false);
            setError(null);
          }
        }}
        title="Modificar hora"
        description="Ajusta la fecha y hora de este registro."
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => {
                setEditOpen(false);
                setError(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" variant="primary" className="w-full sm:w-auto" disabled={pending} onClick={runSave}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </>
        }
      >
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Hora</label>
          <Input
            type="datetime-local"
            value={timeLocal}
            onChange={(e) => setTimeLocal(e.target.value)}
            className="font-mono text-sm tracking-tight"
          />
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>
      </MinimalModal>
    </>
  );
}

export function AdminAddAttendanceForm({ employeeId }: { employeeId: string }) {
  const [state, action] = useFormState(adminAttendanceEventAction, null);
  const nowLocal = new Date();
  nowLocal.setMinutes(nowLocal.getMinutes() - nowLocal.getTimezoneOffset());
  const defaultDt = nowLocal.toISOString().slice(0, 16);

  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="employee_id" value={employeeId} />
      <div>
        <label className="mb-1 block text-xs text-zinc-600">Tipo</label>
        <select name="event_type" required className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm">
          <option value="clock_in">Entrada</option>
          <option value="clock_out">Salida</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-600">Fecha y hora</label>
        <Input name="occurred_at" type="datetime-local" required defaultValue={defaultDt} />
      </div>
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs text-zinc-600">Nota (opcional)</label>
        <Input name="note" placeholder="Correccion, incidencia..." />
      </div>
      {state?.error ? <p className="md:col-span-2 text-xs text-red-600">{state.error}</p> : null}
      <div className="md:col-span-2">
        <Button type="submit" variant="secondary" className="text-xs">
          Registrar fichaje
        </Button>
      </div>
    </form>
  );
}

export function AdminDailyAttendanceActions({
  employeeId,
  items,
}: {
  employeeId: string;
  items: AttendanceRow[];
}) {
  const { chronological } = partitionClockInOut(items);
  const segments = segmentPunchPairsFifo(chronological);
  const punchIds = new Set(chronological.map((r) => r.id));
  const otherEvents = items.filter((r) => !punchIds.has(r.id));

  if (segments.length === 0 && otherEvents.length === 0) {
    return <span className="text-xs text-zinc-400">Sin registros</span>;
  }

  return (
    <div className="inline-flex flex-col items-end gap-2">
      {segments.map((seg) => {
        const rowKey =
          seg.kind === "pair"
            ? `p-${seg.in.id}-${seg.out.id}`
            : seg.kind === "open"
              ? `o-${seg.in.id}`
              : `x-${seg.out.id}`;
        return <AdminPunchSegmentRow key={rowKey} employeeId={employeeId} seg={seg} />;
      })}
      {otherEvents.map((r) => (
        <AdminOtherAttendanceRow key={r.id} employeeId={employeeId} row={r} />
      ))}
    </div>
  );
}

export function AdminFlexHoursForm({ employeeId }: { employeeId: string }) {
  const [state, action] = useFormState(adminFlexHoursLedgerAction, null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="employee_id" value={employeeId} />
      <div>
        <label className="mb-1 block text-xs text-zinc-600">Fecha</label>
        <Input name="occurred_at" type="date" required defaultValue={today} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-600">Horas (+ conceder/reponer, − uso)</label>
        <Input name="delta_hours" type="number" step="0.25" required placeholder="ej. 2 o -1.5" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-600">Tipo</label>
        <select name="kind" required className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm">
          <option value="grant">Concesion / asignacion</option>
          <option value="use">Uso de horas libres</option>
          <option value="repay">Repone (trabajo extra u otro)</option>
          <option value="adjustment">Ajuste administrativo</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-600">Motivo</label>
        <Input name="reason" required placeholder="Breve descripcion" />
      </div>
      <div className="md:col-span-2 lg:col-span-4">
        <label className="mb-1 block text-xs text-zinc-600">Nota interna (opcional)</label>
        <Input name="note" />
      </div>
      {state?.error ? <p className="md:col-span-2 text-xs text-red-600">{state.error}</p> : null}
      <div className="md:col-span-2 lg:col-span-4">
        <Button type="submit" variant="secondary" className="text-xs">
          Registrar movimiento
        </Button>
      </div>
    </form>
  );
}
