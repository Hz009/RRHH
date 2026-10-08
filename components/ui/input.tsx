import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-lm-dark-teal/15 bg-white px-3 text-sm text-zinc-900 transition placeholder:text-zinc-400 focus:border-lm-aqua focus:outline-none focus:ring-2 focus:ring-lm-sky",
        className
      )}
      {...props}
    />
  );
}
