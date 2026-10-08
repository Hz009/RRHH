import Link from "next/link";
import { redirect } from "next/navigation";

import { PayslipSheet } from "@/components/employee-portal/payslip-sheet";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { readViewAsEmployeeId } from "@/lib/view-as";
import { buildMyPayslip } from "@/services/payslip.service";

interface BoletaPageProps {
  searchParams: { month?: string; respuesta?: string };
}

export default async function BoletaPage({ searchParams }: BoletaPageProps) {
  const month = searchParams.month ?? "";
  const payslip = await buildMyPayslip(month);
  if (!payslip) redirect("/employee-portal");
  const declined = searchParams.respuesta === "no";
  const viewOnly = Boolean(readViewAsEmployeeId());

  return (
    <div>
      <Topbar title="Boleta de pago" subtitle="Revisa el detalle antes de descargar el PDF." />
      <div className="space-y-6 p-6">
        <PayslipSheet payslip={payslip} />
        {declined ? (
          <Notice tone="warning">
            No se descargó el archivo. Si ves un error, no aceptes la boleta y escribe a soporte de Recursos Humanos para que la revisen.
          </Notice>
        ) : (
          <Notice tone="warning">
            Descarga el PDF solo si el salario, los bonos, los incentivos y los descuentos están bien. Al aceptarlo confirmas que la boleta es correcta. Si algo no cuadra, no aceptes y contacta a soporte.
          </Notice>
        )}
        {viewOnly ? (
          <p className="text-sm text-zinc-600">Solo puedes ver esta boleta. No puedes aceptarla ni descargarla.</p>
        ) : (
        <div className="flex flex-wrap gap-3">
          <form action="/employee-portal/boleta/download" method="post">
            <input type="hidden" name="month" value={payslip.periodMonth} />
            <input type="hidden" name="decision" value="accept" />
            <Button type="submit">Acepto, está bien. Descargar PDF</Button>
          </form>
          <Link
            href={`/employee-portal/boleta?month=${payslip.periodMonth}&respuesta=no`}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-lm-sky"
          >
            No acepto, hay un error
          </Link>
          <Link href="/employee-portal" className="self-center text-sm text-lm-dark-teal underline">
            Volver a mis pagos
          </Link>
        </div>
        )}
      </div>
    </div>
  );
}
