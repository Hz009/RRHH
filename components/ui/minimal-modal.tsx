"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

interface MinimalModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** Ancho máximo del panel */
  size?: "sm" | "md";
}

const maxW: Record<NonNullable<MinimalModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
};

export function MinimalModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: MinimalModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-zinc-900/35 backdrop-blur-[3px] transition-opacity duration-200"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="minimal-modal-title"
        className={cn(
          "relative z-10 w-full duration-200",
          maxW[size],
          "rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xl shadow-zinc-900/8"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="minimal-modal-title" className="text-base font-semibold tracking-tight text-zinc-900">
          {title}
        </h2>
        {description ? <p className="mt-2 text-sm leading-relaxed text-zinc-500">{description}</p> : null}
        {children ? <div className={description || title ? "mt-5" : ""}>{children}</div> : null}
        {footer ? <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
