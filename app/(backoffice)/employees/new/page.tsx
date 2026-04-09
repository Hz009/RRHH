import { redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { EmployeeForm } from "@/components/employees/employee-form";
import { createEmployeeAction } from "@/app/(backoffice)/employees/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getManagerOptions, getNextEmployeeCode } from "@/services/employees.service";

export default async function NewEmployeePage() {
  const [nextEmployeeCode, managerOptions] = await Promise.all([getNextEmployeeCode(), getManagerOptions()]);

  if (isSupabaseConfigured()) {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") {
      redirect("/employees");
    }
  }

  return (
    <div>
      <Topbar title="Alta de empleado" subtitle="Registro de nuevas incorporaciones al back office." />
      <div className="p-6">
        <Card title="Datos del empleado">
          <EmployeeForm
            action={createEmployeeAction}
            employeeCode={nextEmployeeCode}
            managerOptions={managerOptions}
            defaultUserRole="employee"
            submitLabel="Crear empleado"
            confirmMessage="Confirma que deseas crear este empleado."
          />
        </Card>
      </div>
    </div>
  );
}
