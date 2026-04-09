import { notFound, redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { EmployeeForm } from "@/components/employees/employee-form";
import { EmployeePasswordForm } from "@/components/employees/employee-password-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUserRole, getEmployeeById, getManagerOptions, getProfileRoleByEmail } from "@/services/employees.service";
import { updateEmployeeAction } from "@/app/(backoffice)/employees/actions";

interface EditEmployeePageProps {
  params: {
    id: string;
  };
}

export default async function EditEmployeePage({ params }: EditEmployeePageProps) {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    redirect("/employees");
  }

  const employee = await getEmployeeById(params.id);
  if (!employee) notFound();
  const [managerOptions, profileRole] = await Promise.all([getManagerOptions(), getProfileRoleByEmail(employee.email)]);
  const defaultUserRole: "manager" | "employee" = profileRole === "manager" ? "manager" : "employee";

  return (
    <div>
      <Topbar title={`Editar empleado: ${employee.full_name}`} subtitle="Actualizacion de datos laborales y administrativos." />
      <div className="space-y-6 p-6">
        <Card title="Ficha del empleado">
          <EmployeeForm
            action={updateEmployeeAction}
            employee={employee}
            employeeCode={employee.employee_code}
            managerOptions={managerOptions}
            defaultUserRole={defaultUserRole}
            submitLabel="Guardar cambios"
            confirmMessage="Confirma que deseas guardar los cambios del empleado."
          />
        </Card>
        {isSupabaseConfigured() ? (
          <Card title="Contraseña de acceso (admin)">
            <EmployeePasswordForm employeeId={employee.id} />
          </Card>
        ) : null}
      </div>
    </div>
  );
}
