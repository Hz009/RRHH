import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { LoanForm } from "@/components/loans/loan-form";
import { createLoanAction } from "@/app/(backoffice)/loans/actions";
import { getCurrentEmployee, getCurrentUserRole, getEmployees } from "@/services/employees.service";

export default async function NewLoanPage() {
  const [allEmployees, role, currentEmployee] = await Promise.all([
    getEmployees(),
    getCurrentUserRole(),
    getCurrentEmployee(),
  ]);

  const isAdmin = role === "admin";
  const employees = isAdmin
    ? allEmployees
    : allEmployees.filter((e) => e.id === currentEmployee?.id);

  return (
    <div>
      <Topbar
        title={isAdmin ? "Nuevo prestamo" : "Solicitar prestamo"}
        subtitle={
          isAdmin
            ? "Registro de prestamos y configuracion de cuotas."
            : "Solicita un prestamo. Sera revisado y aprobado por el administrador."
        }
      />
      <div className="p-6">
        <Card title="Datos del prestamo">
          <LoanForm action={createLoanAction} employees={employees} />
        </Card>
      </div>
    </div>
  );
}
