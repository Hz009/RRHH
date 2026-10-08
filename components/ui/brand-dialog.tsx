"use client";

export function BrandDialog({
  open,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-lm-dark-teal/45 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-3xl border border-lm-aqua/30 bg-white p-6 shadow-[0_20px_60px_rgba(24,110,116,0.18)]">
        <p className="text-sm leading-relaxed text-lm-dark-teal">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-lm-sky px-4 py-2 text-sm font-semibold text-lm-dark-teal ring-1 ring-lm-aqua/40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-lm-dark-teal px-4 py-2 text-sm font-semibold text-white"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
