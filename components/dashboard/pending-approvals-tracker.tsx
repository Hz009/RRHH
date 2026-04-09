"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import type { PendingDocConfirmationRow, PendingVacationApprovalRow } from "@/services/dashboard-tracker.service";

type Tab = "documents" | "vacations";

export function PendingApprovalsTracker(props: {
  documents: PendingDocConfirmationRow[];
  vacations: PendingVacationApprovalRow[];
  className?: string;
}) {
  const { documents, vacations, className } = props;
  const [tab, setTab] = useState<Tab>("documents");

  const docCount = documents.length;
  const vacCount = vacations.length;

  return (
    <Card
      className={cn(
        "flex !h-full min-h-[340px] flex-col overflow-hidden !p-0 ring-1 ring-lm-aqua/15 border-l-4 border-l-lm-aqua/50",
        className
      )}
      bodyClassName="mt-0 flex min-h-0 flex-1 flex-col"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-xs"
            aria-hidden
          >
            ⇄
          </span>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Seguimiento</h2>
            <p className="text-[11px] text-zinc-500">Ultimos 3 por pestana</p>
          </div>
        </div>
        <Link href={tab === "documents" ? "/documents" : "/vacations"}>
          <Button type="button" variant="secondary" className="h-8 px-2 text-[11px]">
            Ver todo
          </Button>
        </Link>
      </div>

      <div className="flex gap-3 border-b border-zinc-200 px-3">
        <button
          type="button"
          onClick={() => setTab("documents")}
          className={`border-b-2 py-2 text-xs font-medium transition-colors ${
            tab === "documents" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          Documentos{docCount ? ` (${docCount})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setTab("vacations")}
          className={`border-b-2 py-2 text-xs font-medium transition-colors ${
            tab === "vacations" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          Vacaciones{vacCount ? ` (${vacCount})` : ""}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        {tab === "documents" ? (
          <>
            {docCount > 0 ? (
              <div className="mb-2 rounded-md border border-red-100 bg-red-50/80 px-2 py-2 text-[11px] leading-snug text-red-800">
                <p className="font-semibold">Confirmaciones pendientes</p>
                <p className="mt-0.5 text-red-700/90">Revisa documentos asignados sin acuse.</p>
              </div>
            ) : (
              <p className="mb-2 text-xs text-zinc-500">Sin documentos pendientes en esta vista.</p>
            )}
            <ul className="space-y-1.5">
              {documents.map((d) => (
                <li
                  key={`${d.documentId}-${d.employeeId}`}
                  className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 gap-2">
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800"
                      aria-hidden
                    >
                      !
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-zinc-900">{d.title}</p>
                      <p className="text-[11px] text-zinc-600">
                        <span className="text-amber-700">{d.employeeName}</span>
                        <span className="text-zinc-400"> · </span>
                        {d.category}
                      </p>
                    </div>
                  </div>
                  <Link href="/documents" className="shrink-0">
                    <Button type="button" variant="secondary" className="h-7 w-full px-2 text-[11px] sm:w-auto">
                      Revisar
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            {vacCount > 0 ? (
              <div className="mb-2 rounded-md border border-red-100 bg-red-50/80 px-2 py-2 text-[11px] leading-snug text-red-800">
                <p className="font-semibold">Vacaciones por aprobar</p>
                <p className="mt-0.5 text-red-700/90">Revisa solicitudes en el modulo de vacaciones.</p>
              </div>
            ) : (
              <p className="mb-2 text-xs text-zinc-500">Sin solicitudes en esta vista.</p>
            )}
            <ul className="space-y-1.5">
              {vacations.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 gap-2">
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-800"
                      aria-hidden
                    >
                      i
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-zinc-900">
                        {v.employeeName} — {v.daysRequested} dias
                      </p>
                      <p className="text-[11px] text-zinc-600">
                        <span className="text-red-700">{formatDate(v.startDate)}</span>
                        <span className="text-zinc-400"> — </span>
                        <span className="text-red-700">{formatDate(v.endDate)}</span>
                      </p>
                    </div>
                  </div>
                  <Link href="/vacations" className="shrink-0">
                    <Button type="button" className="h-7 w-full bg-zinc-900 px-2 text-[11px] text-white hover:bg-zinc-800 sm:w-auto">
                      Aprobar
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}
