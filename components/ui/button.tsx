import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-lm-dark-teal text-white shadow-sm hover:bg-lm-aqua-dark hover:shadow",
  secondary: "bg-lm-aqua text-white hover:bg-lm-aqua-dark shadow-sm hover:shadow",
  ghost: "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-lm-sky",
  danger: "bg-lm-orange text-white hover:bg-lm-orange/90 shadow-sm hover:shadow-md",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lm-aqua/50 disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
