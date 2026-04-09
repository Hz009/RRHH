"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { formatDate } from "@/lib/utils";
import type { DocumentWithAck } from "@/services/documents.service";

type StatusFilter = "all" | "confirmed" | "pending";

const categoryLabels: Record<string, string> = {
  contract: "Contrato",
  policy: "Politica",
  evaluation: "Evaluacion",
  payroll: "Nomina",
  announcement: "Anuncio",
  other: "Otro",
};

interface DocumentsListPanelProps {
  documents: DocumentWithAck[];
  acknowledgeAction: (formData: FormData) => Promise<void>;
  isAdmin: boolean;
}

export function DocumentsListPanel({
  documents,
  acknowledgeAction,
  isAdmin,
}: DocumentsListPanelProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const filtered = documents.filter((doc) => {
    if (filter === "confirmed") return doc.acknowledged;
    if (filter === "pending") return !doc.acknowledged && doc.requires_ack;
    return true;
  });

  const pendingCount = documents.filter(
    (d) => !d.acknowledged && d.requires_ack
  ).length;
  const confirmedCount = documents.filter((d) => d.acknowledged).length;

  return (
    <div>
      <Button
        variant="secondary"
        onClick={() => setOpen(!open)}
      >
        {open ? "Ocultar documentos" : `Ver documentos disponibles (${documents.length})`}
      </Button>

      {open ? (
        <Card className="mt-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-zinc-600">Filtrar:</span>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === "all"
                  ? "bg-lm-aqua text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Todos ({documents.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === "pending"
                  ? "bg-amber-600 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Pendientes ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("confirmed")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === "confirmed"
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Confirmados ({confirmedCount})
            </button>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No hay documentos con este filtro.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs text-zinc-600">
                    <th className="px-3 py-2">Titulo</th>
                    <th className="px-3 py-2">Categoria</th>
                    {isAdmin ? (
                      <th className="px-3 py-2">Asignado a</th>
                    ) : null}
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Archivo</th>
                    {!isAdmin ? (
                      <th className="px-3 py-2">Accion</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-zinc-100 hover:bg-zinc-50"
                    >
                      <td className="px-3 py-2 font-medium text-zinc-900">
                        {doc.title}
                      </td>
                      <td className="px-3 py-2 text-zinc-600">
                        {categoryLabels[doc.category] ?? doc.category}
                      </td>
                      {isAdmin ? (
                        <td className="px-3 py-2 text-zinc-600">
                          {doc.is_global ? (
                            <span className="text-xs font-medium text-lm-dark-teal">
                              Todos (Global)
                            </span>
                          ) : doc.assignedEmployeeName ? (
                            doc.assignedEmployeeName
                          ) : (
                            <span className="text-xs text-zinc-400">-</span>
                          )}
                        </td>
                      ) : null}
                      <td className="px-3 py-2 text-zinc-600">
                        {doc.is_global ? "Global" : "Individual"}
                      </td>
                      <td className="px-3 py-2 text-zinc-600">
                        {formatDate(doc.created_at)}
                      </td>
                      <td className="px-3 py-2">
                        {isAdmin && doc.is_global ? (
                          <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                            -
                          </span>
                        ) : doc.acknowledged ? (
                          <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            Confirmado
                          </span>
                        ) : doc.requires_ack ? (
                          <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Pendiente
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                            Sin confirmacion
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {doc.signedUrl ? (
                          <a
                            href={doc.signedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-lm-dark-teal hover:text-lm-dark-teal hover:underline"
                          >
                            Ver / Descargar
                          </a>
                        ) : (
                          <span className="text-xs text-zinc-400">-</span>
                        )}
                      </td>
                      {!isAdmin ? (
                        <td className="px-3 py-2">
                          {!doc.acknowledged && doc.requires_ack ? (
                            <form action={acknowledgeAction}>
                              <input
                                type="hidden"
                                name="document_id"
                                value={doc.id}
                              />
                              <ConfirmSubmitButton
                                type="submit"
                                className="h-7 px-2 text-xs"
                                confirmMessage="Confirmas la lectura y confirmacion del documento?"
                              >
                                Confirmar
                              </ConfirmSubmitButton>
                            </form>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
