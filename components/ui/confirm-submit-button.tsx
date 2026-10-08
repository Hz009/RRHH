"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";

import { BrandDialog } from "@/components/ui/brand-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";

interface ConfirmSubmitButtonProps extends ButtonProps {
  confirmMessage: string;
}

export function ConfirmSubmitButton({ confirmMessage, onClick, children, disabled, ...props }: ConfirmSubmitButtonProps) {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const confirmed = React.useRef(false);
  const [open, setOpen] = React.useState(false);
  const { pending } = useFormStatus();

  return (
    <>
      <Button
        {...props}
        ref={buttonRef}
        type="submit"
        disabled={disabled || pending}
        onClick={(event) => {
          if (confirmed.current) {
            confirmed.current = false;
            onClick?.(event);
            return;
          }
          event.preventDefault();
          const form = event.currentTarget.form;
          if (form && !form.reportValidity()) return;
          setOpen(true);
        }}
      >
        {pending ? "Guardando..." : children}
      </Button>
      <BrandDialog
        open={open}
        message={confirmMessage}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          confirmed.current = true;
          setOpen(false);
          buttonRef.current?.click();
        }}
      />
    </>
  );
}
