"use client";

import * as React from "react";

import { BrandDialog } from "@/components/ui/brand-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";

interface ConfirmSubmitButtonProps extends ButtonProps {
  confirmMessage: string;
}

export function ConfirmSubmitButton({ confirmMessage, onClick, ...props }: ConfirmSubmitButtonProps) {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        {...props}
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
          onClick?.(event);
        }}
      />
      <BrandDialog
        open={open}
        message={confirmMessage}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          buttonRef.current?.form?.requestSubmit();
        }}
      />
    </>
  );
}
