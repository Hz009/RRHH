"use client";

import * as React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

interface ConfirmSubmitButtonProps extends ButtonProps {
  confirmMessage: string;
}

export function ConfirmSubmitButton({ confirmMessage, onClick, ...props }: ConfirmSubmitButtonProps) {
  return (
    <Button
      {...props}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      }}
    />
  );
}
