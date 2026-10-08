import { redirect } from "next/navigation";

import { updateOwnContactAction } from "@/app/(backoffice)/employees/actions";
import { EmployeeForm } from "@/components/employees/employee-form";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { getCurrentEmployee, getEmployeeById } from "@/services/employees.service";

export default async function OwnContactPage() {
  const current = await getCurrentEmployee();
  if (!current) redirect("/dashboard");

  const employee = await getEmployeeById(current.id);
  if (!employee) redirect("/dashboard");
  const manager = employee.manager_id ? await getEmployeeById(employee.manager_id) : null;

  return (
    <div>
      <Topbar
        title="Mis datos"
        subtitle="Puedes cambiar tu nombre, contacto, domicilio y forma de pago. El sueldo, el cargo y el estado los cambia el administrador."
      />
      <div className="p-6">
        <Card title="Datos que puedes editar">
          <EmployeeForm
            mode="self"
            action={updateOwnContactAction}
            employee={employee}
            employeeCode={employee.employee_code}
            managerOptions={[]}
            defaultUserRole="employee"
            submitLabel="Guardar mis datos"
            confirmMessage="Confirma que tus datos de domicilio y pago están bien."
            managerName={manager?.full_name ?? null}
          />
        </Card>
      </div>
    </div>
  );
}
