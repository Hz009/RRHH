import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-zinc-300 bg-white/95 px-3 text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 transition focus:border-lm-aqua focus:outline-none focus:ring-2 focus:ring-lm-sky",
        className
      )}
      {...props}
    />
  );
}
