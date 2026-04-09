import Link from "next/link";
import { notFound } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getEmployeeById } from "@/services/employees.service";
import { getLoanById, getLoanRepaymentsByLoanId } from "@/services/loans.service";

interface LoanDetailPageProps {
  params: {
    id: string;
  };
}

export default async function LoanDetailPage({ params }: LoanDetailPageProps) {
  const loan = await getLoanById(params.id);
  if (!loan) notFound();

  const [repayments, employee] = await Promise.all([getLoanRepaymentsByLoanId(loan.id), getEmployeeById(loan.employee_id)]);
  const totalPaid = repayments.reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);

  return (
    <div>
      <Topbar
        title="Detalle de prestamo"
        subtitle="Historial de pagos, montos registrados y estado del prestamo."
      />
      <div className="space-y-6 p-6">
        <Card className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-zinc-900">{loan.description}</p>
              <p className="text-sm text-zinc-500">Empleado: {employee?.full_name ?? "Sin nombre"}</p>
            </div>
            <Badge variant={loan.status === "active" ? "success" : "default"}>{loan.status}</Badge>
          </div>
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <p>
              <span className="font-medium">Principal:</span> {formatCurrency(loan.principal_amount, loan.currency)}
            </p>
            <p>
              <span className="font-medium">Total pagado:</span> {formatCurrency(totalPaid, loan.currency)}
            </p>
            <p>
              <span className="font-medium">Saldo pendiente:</span> {formatCurrency(loan.outstanding_balance, loan.currency)}
            </p>
            <p>
              <span className="font-medium">Cuotas:</span> {loan.installments_paid}/{loan.installments_total}
            </p>
            <p>
              <span className="font-medium">Cuota mensual:</span> {formatCurrency(loan.installment_amount, loan.currency)}
            </p>
            <p>
              <span className="font-medium">Inicio:</span> {formatDate(loan.start_date)}
            </p>
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Historial de pagos</h2>
            <Link href="/loans" className="text-sm text-lm-aqua hover:text-lm-dark-teal">
              Volver a prestamos
            </Link>
          </div>
          <Table>
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha de pago</th>
                  <th className="px-4 py-3 font-medium">Monto</th>
                  <th className="px-4 py-3 font-medium">Origen</th>
                  <th className="px-4 py-3 font-medium">Periodo nomina</th>
                  <th className="px-4 py-3 font-medium">Nota</th>
                </tr>
              </thead>
              <tbody>
                {repayments.length === 0 ? (
                  <tr className="border-t border-zinc-200">
                    <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                      Aun no hay pagos registrados para este prestamo.
                    </td>
                  </tr>
                ) : (
                  repayments.map((repayment) => (
                    <tr key={repayment.id} className="border-t border-zinc-200">
                      <td className="px-4 py-3">{formatDate(repayment.paid_on)}</td>
                      <td className="px-4 py-3">{formatCurrency(repayment.amount, loan.currency)}</td>
                      <td className="px-4 py-3">{repayment.source}</td>
                      <td className="px-4 py-3">{repayment.payroll_period ?? "-"}</td>
                      <td className="px-4 py-3">{repayment.note ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Table>
        </Card>
      </div>
    </div>
  );
}
