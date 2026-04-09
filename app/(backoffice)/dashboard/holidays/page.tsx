import Link from "next/link";
import { redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { formatSpainHolidayDateEn, getSpainNationalHolidaysForYear } from "@/lib/spain-national-holidays";
import { getCurrentEmployee, getCurrentUserRole } from "@/services/employees.service";

export default async function DashboardSpainHolidaysPage() {
  const [role, currentEmp] = await Promise.all([getCurrentUserRole(), getCurrentEmployee()]);
  const allowed =
    role === "admin" || (role === "manager" && currentEmp?.residence_country?.toUpperCase() === "ES");
  if (!allowed) {
    redirect("/dashboard");
  }

  const year = new Date().getFullYear();
  const holidays = getSpainNationalHolidaysForYear(year);

  return (
    <div>
      <Topbar
        title="Festivos en España"
        subtitle="Calendario de festivos laborales de ámbito estatal. Sin autonómicos ni locales."
      />
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard">
            <Button type="button" variant="ghost">
              Volver al dashboard
            </Button>
          </Link>
        </div>

        <section className="rounded-2xl border border-lm-aqua/15 bg-white p-5 shadow-sm ring-1 ring-zinc-100/60">
          <h2 className="text-sm font-semibold text-lm-dark-teal">{year}</h2>
          <ul className="mt-4 divide-y divide-zinc-100">
            {holidays.map((h) => (
              <li key={`${h.date.toISOString()}-${h.nameEn}`} className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0">
                <div>
                  <p className="font-medium text-zinc-900">{h.nameEs}</p>
                  <p className="text-xs text-zinc-500">{h.nameEn}</p>
                </div>
                <p className="text-sm text-zinc-700">{formatSpainHolidayDateEn(h.date)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
