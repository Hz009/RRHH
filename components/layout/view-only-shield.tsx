"use client";

import { useEffect } from "react";

/** Bloquea envíos de formularios mientras el administrador solo mira el portal de otra persona. */
export function ViewOnlyShield({ active, children }: { active: boolean; children: React.ReactNode }) {
  useEffect(() => {
    if (!active) return;

    function onSubmit(event: Event) {
      const form = event.target as HTMLFormElement | null;
      if (form?.dataset.allowViewAs === "exit") return;
      event.preventDefault();
      event.stopPropagation();
    }

    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, [active]);

  return <>{children}</>;
}
