import Link from "next/link";

import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getCurrentUserRole, getEmployees } from "@/services/employees.service";
import { getLoans } from "@/services/loans.service";
import { approveLoanAction, registerRepaymentAction, rejectLoanAction } from "@/app/(backoffice)/loans/actions";

interface LoansPageProps {
  searchParams: {
    q?: string;
    status?: string;
    repayment?: string;
    loan?: string;
  };
}

const statusLabels: Record<string, string> = {
  draft: "Pendiente",
  active: "Activo",
  paid: "Pagado",
  defaulted: "Incumplido",
  cancelled: "Cancelado",
};

const statusVariants: Record<string, "success" | "default" | "warning"> = {
  draft: "warning",
  active: "success",
  paid: "default",
  defaulted: "default",
  cancelled: "default",
};

export default async function LoansPage({ searchParams }: LoansPageProps) {
  const [loans, role, employees] = await Promise.all([
    getLoans({
      query: searchParams.q,
      status: searchParams.status,
    }),
    getCurrentUserRole(),
    getEmployees(),
  ]);
  const isAdmin = role === "admin";
  const employeeNameById = new Map(employees.map((employee) => [employee.id, employee.full_name]));
  const returnParams = new URLSearchParams();
  if (searchParams.q) returnParams.set("q", searchParams.q);
  if (searchParams.status) returnParams.set("status", searchParams.status);
  const returnTo = returnParams.toString() ? `/loans?${returnParams.toString()}` : "/loans";
  const paymentSaved = searchParams.repayment === "success";
  const loanCreated = searchParams.loan === "created";
  const loanApproved = searchParams.loan === "approved";
  const loanRejected = searchParams.loan === "rejected";

  return (
    <div>
      <Topbar title="Prestamos a empleados" subtitle="Control de prestamos, saldo pendiente y cuotas." />
      <div className="space-y-6 p-6">
        {paymentSaved ? (
          <Card className="border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Se registro pago.</Card>
        ) : null}
        {loanCreated ? (
          <Card className="border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {isAdmin ? "Se registro el prestamo correctamente." : "Se envio la solicitud de prestamo. Sera revisada por el administrador."}
          </Card>
        ) : null}
        {loanApproved ? (
          <Card className="border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Prestamo aprobado.</Card>
        ) : null}
        {loanRejected ? (
          <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-800">Prestamo rechazado.</Card>
        ) : null}

        <Card>
          <form className="grid gap-3 md:grid-cols-4">
            <Input name="q" placeholder="Buscar por descripcion" defaultValue={searchParams.q} />
            <select
              name="status"
              defaultValue={searchParams.status ?? ""}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="draft">Pendiente de aprobacion</option>
              <option value="active">Activo</option>
              <option value="paid">Pagado</option>
              <option value="defaulted">Incumplido</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit">Filtrar</Button>
              <Link href="/loans/new">
                <Button variant="secondary">
                  {isAdmin ? "Nuevo prestamo" : "Solicitar prestamo"}
                </Button>
              </Link>
            </div>
          </form>
        </Card>

        <Table>
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Prestamo</th>
                <th className="px-4 py-3 font-medium">Principal</th>
                <th className="px-4 py-3 font-medium">Saldo pendiente</th>
                <th className="px-4 py-3 font-medium">Cuotas</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Fecha inicio</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id} className="border-t border-zinc-200">
                  <td className="px-4 py-3">
                    <Link href={`/loans/${loan.id}`} className="font-medium text-lm-dark-teal hover:text-lm-dark-teal hover:underline">
                      {loan.description}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      {employeeNameById.get(loan.employee_id) ?? "Sin nombre"}
                    </p>
                  </td>
                  <td className="px-4 py-3">{formatCurrency(loan.principal_amount, loan.currency)}</td>
                  <td className="px-4 py-3">{formatCurrency(loan.outstanding_balance, loan.currency)}</td>
                  <td className="px-4 py-3">
                    {loan.installments_paid}/{loan.installments_total}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariants[loan.status] ?? "default"}>
                      {statusLabels[loan.status] ?? loan.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{formatDate(loan.start_date)}</td>
                  <td className="px-4 py-3">
                    {isAdmin && loan.status === "draft" ? (
                      <div className="flex gap-2">
                        <form action={approveLoanAction}>
                          <input type="hidden" name="loan_id" value={loan.id} />
                          <ConfirmSubmitButton type="submit" className="h-8 px-3 text-xs" confirmMessage="Aprobar este prestamo?">
                            Aprobar
                          </ConfirmSubmitButton>
                        </form>
                        <form action={rejectLoanAction}>
                          <input type="hidden" name="loan_id" value={loan.id} />
                          <ConfirmSubmitButton type="submit" className="h-8 px-3 text-xs" variant="danger" confirmMessage="Rechazar este prestamo?">
                            Rechazar
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    ) : isAdmin && loan.status === "active" ? (
                      <form action={registerRepaymentAction} className="flex items-center gap-2">
                        <input type="hidden" name="loan_id" value={loan.id} />
                        <input type="hidden" name="employee_id" value={loan.employee_id} />
                        <input type="hidden" name="return_to" value={returnTo} />
                        <Input name="amount" type="number" step="0.01" min="0" className="h-8 w-24" />
                        <Input name="paid_on" type="date" className="h-8 w-36" />
                        <ConfirmSubmitButton type="submit" className="h-8 px-3 text-xs" confirmMessage="Confirma que deseas registrar este pago.">
                          Pagar
                        </ConfirmSubmitButton>
                      </form>
                    ) : (
                      <p className="text-xs text-zinc-500">
                        {loan.status === "draft" ? "Pendiente de aprobacion" : "-"}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Table>
      </div>
    </div>
  );
}
