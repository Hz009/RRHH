"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { VacationBalanceSummary } from "@/services/vacations.service";

interface VacationBalancePanelProps {
  summaries: VacationBalanceSummary[];
  role: "admin" | "manager" | "employee";
  currentEmployeeId: string | null;
}

export function VacationBalancePanel({
  summaries,
  role,
  currentEmployeeId,
}: VacationBalancePanelProps) {
  const isEmployee = role === "employee";
  const filtered = isEmployee
    ? summaries.filter((s) => s.employeeId === currentEmployeeId)
    : summaries;

  const [open, setOpen] = useState(isEmployee);

  if (isEmployee && filtered.length === 0) return null;

  return (
    <div>
      {!isEmployee ? (
        <Button variant="secondary" onClick={() => setOpen(!open)}>
          {open
            ? "Ocultar dias disponibles"
            : "Ver dias disponibles de empleados"}
        </Button>
      ) : null}

      {open ? (
        <Card className={isEmployee ? "" : "mt-4"} title={isEmployee ? "Mis dias de vacaciones" : undefined}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-600">
                  {!isEmployee ? <th className="px-3 py-2">Nombre</th> : null}
                  <th className="px-3 py-2 text-right">Dias de Vacaciones</th>
                  <th className="px-3 py-2 text-right">Dias Usados</th>
                  <th className="px-3 py-2 text-right">Dias Restantes</th>
                  <th className="px-3 py-2 text-right">Dias Programados</th>
                  <th className="px-3 py-2 text-right">Dias Disponibles</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const restantes = Math.max(
                    s.annualAllocation - s.usedFromCurrentYear,
                    0
                  );
                  return (
                    <tr
                      key={s.employeeId}
                      className="border-b border-zinc-100 hover:bg-zinc-50"
                    >
                      {!isEmployee ? (
                        <td className="px-3 py-2 font-medium text-zinc-900">
                          {s.employeeName}
                        </td>
                      ) : null}
                      <td className="px-3 py-2 text-right">
                        {s.annualAllocation}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {s.usedFromCurrentYear}
                      </td>
                      <td className="px-3 py-2 text-right">{restantes}</td>
                      <td className="px-3 py-2 text-right">
                        {s.scheduledDays}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                        {s.remainingAvailable}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
