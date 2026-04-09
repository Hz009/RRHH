"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const SNOOZE_KEY = "lm_dashboard_notifications_snooze";

interface PendingDocument {
  id: string;
  title: string;
  category: string;
  signedUrl: string | null;
}

interface ApprovedVacation {
  id: string;
  start_date: string;
  end_date: string;
  days_requested: number;
}

interface LoginNotificationsModalProps {
  pendingDocuments: PendingDocument[];
  approvedVacations: ApprovedVacation[];
  acknowledgeAction: (formData: FormData) => Promise<void>;
}

const categoryLabels: Record<string, string> = {
  contract: "Contrato",
  policy: "Politica",
  evaluation: "Evaluacion",
  payroll: "Nomina",
  announcement: "Anuncio",
  other: "Otro",
};

function snoozeUntilTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  try {
    localStorage.setItem(SNOOZE_KEY, String(d.getTime()));
  } catch {
    /* ignore */
  }
}

function isSnoozed(): boolean {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    const t = Number(raw);
    return !Number.isNaN(t) && Date.now() < t;
  } catch {
    return false;
  }
}

function DocumentRow({
  doc,
  acknowledgeAction,
  onConfirmed,
}: {
  doc: PendingDocument;
  acknowledgeAction: (formData: FormData) => Promise<void>;
  onConfirmed: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);

  function handleConfirm() {
    if (!window.confirm(`Confirmas la lectura del documento "${doc.title}"?`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("document_id", doc.id);
      await acknowledgeAction(fd);
      setConfirmed(true);
      onConfirmed(doc.id);
    });
  }

  if (confirmed) return null;

  return (
    <div className="rounded-lg border border-amber-200/90 bg-amber-50/90 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900">{doc.title}</p>
          <p className="text-xs text-zinc-600">{categoryLabels[doc.category] ?? doc.category}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {doc.signedUrl ? (
            <a
              href={doc.signedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 min-w-[44px] items-center justify-center rounded-lg bg-lm-sky px-3 text-xs font-semibold text-lm-dark-teal transition-colors hover:bg-lm-aqua/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lm-aqua/60"
            >
              Ver
            </a>
          ) : null}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="inline-flex h-9 min-w-[44px] items-center justify-center rounded-lg bg-lm-dark-teal px-3 text-xs font-semibold text-white hover:bg-lm-aqua-dark disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lm-aqua/60"
          >
            {isPending ? "Confirmando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LoginNotificationsModal({
  pendingDocuments,
  approvedVacations,
  acknowledgeAction,
}: LoginNotificationsModalProps) {
  const hasNotifications = pendingDocuments.length > 0 || approvedVacations.length > 0;
  const [open, setOpen] = useState(false);
  const [remainingDocs, setRemainingDocs] = useState(pendingDocuments.map((d) => d.id));

  useEffect(() => {
    if (!hasNotifications) return;
    if (isSnoozed()) return;
    setOpen(true);
  }, [hasNotifications]);

  if (!hasNotifications) return null;
  if (!open) return null;

  function handleConfirmed(id: string) {
    setRemainingDocs((prev) => prev.filter((d) => d !== id));
  }

  const visibleDocs = pendingDocuments.filter((d) => remainingDocs.includes(d.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-lm-dark-teal/25 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-notifications-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-lm-aqua/25 bg-white shadow-xl shadow-lm-dark-teal/10">
        <div className="border-b border-lm-aqua/20 bg-gradient-to-r from-lm-sky via-lm-sky/90 to-lm-sky/70 px-6 py-5">
          <h2 id="login-notifications-title" className="text-lg font-semibold text-lm-dark-teal">
            Tienes avisos pendientes
          </h2>
          <p className="mt-1 text-sm text-zinc-700">Revisa documentos y vacaciones antes de continuar.</p>
        </div>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5">
          {visibleDocs.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-lm-dark-teal">
                Documentos por confirmar ({visibleDocs.length})
              </h3>
              <div className="space-y-2">
                {visibleDocs.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    acknowledgeAction={acknowledgeAction}
                    onConfirmed={handleConfirmed}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">Puedes abrir el documento antes de confirmar.</p>
            </div>
          ) : null}

          {approvedVacations.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-lm-dark-teal">
                Vacaciones aprobadas ({approvedVacations.length})
              </h3>
              <div className="space-y-2">
                {approvedVacations.map((vac) => (
                  <div
                    key={vac.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-lm-aqua/30 bg-lm-sky/50 px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {formatDate(vac.start_date)} — {formatDate(vac.end_date)}
                      </p>
                      <p className="text-xs text-zinc-600">{vac.days_requested} dia(s) aprobados</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-lm-aqua/30 px-2.5 py-1 text-xs font-semibold text-lm-dark-teal">
                      Aprobado
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {visibleDocs.length === 0 && approvedVacations.length === 0 ? (
            <p className="text-sm text-zinc-600">Has confirmado todos los documentos.</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-lm-aqua/15 bg-lm-sky/20 px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 w-full sm:order-1 sm:w-auto"
            onClick={() => {
              snoozeUntilTomorrow();
              setOpen(false);
            }}
          >
            Ocultar hasta manana
          </Button>
          <Button type="button" variant="primary" className="min-h-11 w-full sm:w-auto" onClick={() => setOpen(false)}>
            Entendido, cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
