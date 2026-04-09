import Link from "next/link";
import { Calendar, Umbrella } from "lucide-react";

import type { SpainNationalHoliday } from "@/lib/spain-national-holidays";
import { formatSpainHolidayDateEn } from "@/lib/spain-national-holidays";

function SpainFlagRound({ className }: { className?: string }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-zinc-200 shadow-sm ${className ?? ""}`}
      aria-hidden
      title="España"
    >
      <span className="h-full w-[22%] bg-[#AA151B]" />
      <span className="h-full flex-1 bg-[#F1BF00]" />
      <span className="h-full w-[22%] bg-[#AA151B]" />
    </span>
  );
}

interface PublicHolidaysSpainCardProps {
  preview: SpainNationalHoliday[];
}

export function PublicHolidaysSpainCard({ preview }: PublicHolidaysSpainCardProps) {
  return (
    <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm ring-1 ring-zinc-100/80">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700"
            aria-hidden
          >
            <Umbrella className="h-4 w-4" strokeWidth={2} />
          </span>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">Public holidays</h2>
        </div>
        <Link
          href="/dashboard/holidays"
          className="shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
        >
          View all
        </Link>
      </div>

      <ul className="divide-y divide-zinc-100">
        {preview.map((h) => (
          <li key={`${h.date.toISOString()}-${h.nameEn}`} className="flex items-center gap-3 py-3">
            <SpainFlagRound />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-900">{h.nameEn}</p>
              <p className="text-xs text-zinc-500">Spain</p>
            </div>
            <p className="shrink-0 text-right text-xs font-medium text-zinc-700">
              {formatSpainHolidayDateEn(h.date)}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-2 border-t border-zinc-100 pt-3">
        <Link
          href="/dashboard/holidays"
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-100 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200"
        >
          <Calendar className="h-4 w-4 shrink-0" aria-hidden />
          View calendar
        </Link>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-zinc-400">
        Festivos de ámbito estatal en España. No incluyen festivos autonómicos ni locales.
      </p>
    </section>
  );
}
