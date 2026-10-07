"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { formatDate } from "@/lib/utils";
import type { Database } from "@/types/database";

type VacationRequest = Database["public"]["Tables"]["vacation_requests"]["Row"];

type View = "closed" | "pending" | "all";

interface VacationRequestsPanelProps {
  requests: VacationRequest[];
  employeeNameById: Record<string, string>;
  approverNames: Record<string, string>;
  canApprove: boolean;
  updateStatusAction: (formData: FormData) => Promise<void>;
}

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-zinc-100 text-zinc-600",
};

export function VacationRequestsPanel({
  requests,
  employeeNameById,
  approverNames,
  canApprove,
  updateStatusAction,
}: VacationRequestsPanelProps) {
  const [view, setView] = useState<View>("closed");

  const pendingRequests = requests.filter(
    (r) => r.request_status === "pending"
  );

  function toggleView(target: View) {
    setView((current) => (current === target ? "closed" : target));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button
          variant={view === "pending" ? "primary" : "secondary"}
          onClick={() => toggleView("pending")}
        >
          Solicitudes pendientes ({pendingRequests.length})
        </Button>
        <Button
          variant={view === "all" ? "primary" : "ghost"}
          onClick={() => toggleView("all")}
        >
          Ver todas las solicitudes
        </Button>
      </div>

      {view === "pending" ? (
        <Card>
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No hay solicitudes pendientes.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3"
                >
                  <div>
                    <p className="font-medium text-zinc-900">
                      {employeeNameById[request.employee_id] ?? "Empleado"}
                    </p>
                    <p className="text-xs text-zinc-600">
                      {formatDate(request.start_date)} -{" "}
                      {formatDate(request.end_date)} ({request.days_requested}{" "}
                      dias)
                    </p>
                    <p className="text-xs text-zinc-600">
                      {request.request_kind === "permission" ? "Permiso" : "Vacaciones"} · {request.reason ?? "Sin motivo"}
                    </p>
                  </div>
                  {canApprove ? (
                    <div className="flex gap-2">
                      <form action={updateStatusAction}>
                        <input type="hidden" name="id" value={request.id} />
                        <input type="hidden" name="status" value="approved" />
                        <ConfirmSubmitButton
                          type="submit"
                          className="h-8 px-3 text-xs"
                          confirmMessage="Aprobar solicitud?"
                        >
                          Aprobar
                        </ConfirmSubmitButton>
                      </form>
                      <form action={updateStatusAction}>
                        <input type="hidden" name="id" value={request.id} />
                        <input type="hidden" name="status" value="rejected" />
                        <ConfirmSubmitButton
                          type="submit"
                          className="h-8 px-3 text-xs"
                          variant="danger"
                          confirmMessage="Rechazar solicitud?"
                        >
                          Rechazar
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {view === "all" ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-600">
                  <th className="px-3 py-2">Empleado</th>
                  <th className="px-3 py-2">Fechas</th>
                  <th className="px-3 py-2 text-right">Dias</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Motivo</th>
                  <th className="px-3 py-2">Aprobado por</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-b border-zinc-100 hover:bg-zinc-50"
                  >
                    <td className="px-3 py-2 font-medium text-zinc-900">
                      {employeeNameById[request.employee_id] ?? "Empleado"}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">
                      {formatDate(request.start_date)} -{" "}
                      {formatDate(request.end_date)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {request.days_requested}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusColors[request.request_status] ?? ""
                        }`}
                      >
                        {statusLabels[request.request_status] ??
                          request.request_status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-600">
                      {request.request_kind === "permission" ? "Permiso" : "Vacaciones"} · {request.reason ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">
                      {request.approved_by
                        ? approverNames[request.approved_by] ?? "-"
                        : "-"}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-4 text-center text-zinc-500"
                    >
                      No hay solicitudes para el anio actual.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
