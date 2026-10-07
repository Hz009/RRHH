"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";

import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { getCountryOptionsEs, matchPayrollSelectValue, payrollCurrencySelectOptions } from "@/lib/countries";
import {
  LINGUAMEETING_DEPARTMENTS,
  LINGUAMEETING_JOB_TITLES,
  selectOptionsFromCatalog,
} from "@/lib/employee-taxonomy";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types/domain";

const labelClass = "mb-1 block text-sm font-medium text-lm-dark-teal";

const selectTeal = cn(
  "h-10 w-full rounded-lg border border-lm-dark-teal/50 bg-white px-3 text-sm text-zinc-900 shadow-xs",
  "focus:border-lm-aqua focus:outline-none focus:ring-2 focus:ring-lm-sky"
);

const selectNeutral = cn(
  "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-xs",
  "focus:border-lm-aqua focus:outline-none focus:ring-2 focus:ring-lm-sky"
);

interface EmployeeFormProps {
  action: (
    prevState: { error?: string } | null,
    formData: FormData
  ) => Promise<{ error?: string }>;
  employee?: Employee | null;
  employeeCode: string;
  managerOptions: Array<Pick<Employee, "id" | "full_name" | "email">>;
  defaultUserRole: "manager" | "employee";
  submitLabel: string;
  confirmMessage: string;
}

export function EmployeeForm({
  action,
  employee,
  employeeCode,
  managerOptions,
  defaultUserRole,
  submitLabel,
  confirmMessage,
}: EmployeeFormProps) {
  const [state, formAction] = useFormState(action, null);
  const [hireDate, setHireDate] = useState(employee?.hire_date ?? "");
  const [salaryEffectiveDate, setSalaryEffectiveDate] = useState(
    employee?.current_salary_effective_date ?? employee?.hire_date ?? ""
  );
  const [paymentMethod, setPaymentMethod] = useState(employee?.payment_method ?? "bank");
  const [employeeType, setEmployeeType] = useState(employee?.employee_type ?? "full_time");

  const countryOptions = useMemo(() => getCountryOptionsEs(), []);
  const departmentOptions = useMemo(
    () => selectOptionsFromCatalog(LINGUAMEETING_DEPARTMENTS, employee?.department),
    [employee?.department]
  );
  const jobTitleOptions = useMemo(
    () => selectOptionsFromCatalog(LINGUAMEETING_JOB_TITLES, employee?.job_title),
    [employee?.job_title]
  );
  const salaryCurrencyOptions = useMemo(
    () => payrollCurrencySelectOptions(employee?.current_salary_currency),
    [employee?.current_salary_currency]
  );
  const salaryCurrencyDefault = useMemo(
    () => matchPayrollSelectValue(employee?.current_salary_currency, salaryCurrencyOptions, "USD"),
    [employee?.current_salary_currency, salaryCurrencyOptions]
  );

  const defaultFirstName = employee?.first_name ?? employee?.full_name?.split(" ")[0] ?? "";
  const defaultLastName =
    employee?.last_name ??
    employee?.full_name
      ?.split(" ")
      .slice(1)
      .join(" ") ??
    "";

  const defaultBankAccount =
    employee?.bank_account_number ??
    (employee?.payment_method === "bank" ? (employee?.payment_account ?? "") : "");
  const defaultPaypal =
    employee?.paypal_email ?? (employee?.payment_method === "paypal" ? (employee?.payment_account ?? "") : "");
  const defaultWise =
    employee?.payment_method === "wise" ? (employee?.payment_account ?? "") : "";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const employeeType = String(formData.get("employee_type") ?? "");
    const salaryAmount = Number(formData.get("current_salary_amount") ?? 0);

    if (employeeType === "hourly" && salaryAmount > 100) {
      const ok = window.confirm(
        "Aviso: este colaborador es de pago por horas y la tarifa supera 100 por hora. ¿Confirmas que deseas guardar este valor?"
      );
      if (!ok) {
        event.preventDefault();
      }
    }
  }

  function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="md:col-span-2 mt-2 text-sm font-semibold tracking-wide text-lm-dark-teal">{children}</h3>;
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      {employee ? <input type="hidden" name="id" value={employee.id} /> : null}

      {state?.error ? (
        <div className="md:col-span-2 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-sm text-zinc-700">Codigo</label>
        <Input value={employeeCode} readOnly disabled />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Nombre</label>
        <Input name="first_name" required defaultValue={defaultFirstName} />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Apellido</label>
        <Input name="last_name" required defaultValue={defaultLastName} />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Email</label>
        <Input name="email" type="email" required defaultValue={employee?.email} />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Telefono</label>
        <Input name="phone" defaultValue={employee?.phone ?? ""} />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Departamento</label>
        <select
          name="department"
          required
          defaultValue={employee?.department ?? ""}
          className={selectNeutral}
        >
          <option value="" disabled>
            Seleccionar departamento
          </option>
          {departmentOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Cargo</label>
        <select
          name="job_title"
          required
          defaultValue={employee?.job_title ?? ""}
          className={selectNeutral}
        >
          <option value="" disabled>
            Seleccionar cargo
          </option>
          {jobTitleOptions.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Tipo de usuario</label>
        <select
          name="user_role"
          defaultValue={defaultUserRole}
          className={selectNeutral}
        >
          <option value="employee">employee</option>
          <option value="manager">manager</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Nacionalidad</label>
        <select name="nationality" defaultValue={employee?.nationality ?? ""} className={selectNeutral}>
          <option value="">Seleccionar pais</option>
          {countryOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Residencia</label>
        <select
          name="residence_country"
          defaultValue={employee?.residence_country ?? ""}
          className={selectNeutral}
        >
          <option value="">Seleccionar pais</option>
          {countryOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Tipo de empleado</label>
        <select
          name="employee_type"
          value={employeeType}
          onChange={(e) => setEmployeeType(e.target.value as typeof employeeType)}
          className={selectNeutral}
        >
          <option value="full_time">Full time</option>
          <option value="part_time">Part time</option>
          <option value="hourly">Pago por horas</option>
        </select>
      </div>
      {employeeType === "hourly" ? (
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-lm-dark-teal">
            Como se registran las horas (solo por horas)
          </label>
          <select
            name="hourly_hours_source"
            defaultValue={employee?.hourly_hours_source ?? "manual_monthly"}
            className={selectNeutral}
          >
            <option value="manual_monthly">Horas mensuales cargadas por administracion (ej. coaches)</option>
            <option value="punch">Fichaje de entrada y salida por el empleado</option>
          </select>
        </div>
      ) : null}
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Manager asignado</label>
        <select name="manager_id" defaultValue={employee?.manager_id ?? ""} className={selectNeutral}>
          <option value="">Sin manager</option>
          {managerOptions
            .filter((manager) => manager.id !== employee?.id)
            .map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.full_name} ({manager.email})
              </option>
            ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Fecha de contratacion</label>
        <Input
          name="hire_date"
          type="date"
          required
          value={hireDate}
          onChange={(event) => {
            const value = event.target.value;
            setHireDate(value);
            if (!employee) setSalaryEffectiveDate(value);
          }}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Estado</label>
        <select
          name="employment_status"
          defaultValue={employee?.employment_status ?? "active"}
          className={selectNeutral}
        >
          <option value="active">Activo</option>
          <option value="on_leave">De baja</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Salario actual</label>
        <Input
          name="current_salary_amount"
          type="number"
          step="0.01"
          min="0"
          defaultValue={employee?.current_salary_amount ?? 0}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Moneda (sueldo, factura y bonos)</label>
        <select
          name="current_salary_currency"
          required
          defaultValue={salaryCurrencyDefault}
          className={selectNeutral}
        >
          {salaryCurrencyOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Fecha salario actual</label>
        <Input
          name="current_salary_effective_date"
          type="date"
          value={salaryEffectiveDate}
          onChange={(event) => setSalaryEffectiveDate(event.target.value)}
          readOnly={!employee}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-700">Dias de vacaciones al ano</label>
        <p className="mb-1 text-xs text-zinc-500">Por defecto 30. Se puede cambiar, por ejemplo a 15 o 20.</p>
        <Input
          name="vacation_days_per_year"
          type="number"
          min="0"
          defaultValue={employee?.vacation_days_per_year ?? 30}
        />
      </div>

      <SectionTitle>Titular y domicilio (como en banco o documento de identidad)</SectionTitle>
      <div className="md:col-span-2">
        <label className={labelClass}>
          Nombre completo (como figura en tu banco o pasaporte / DNI)
        </label>
        <Input
          name="legal_name_bank"
          placeholder="Nombre completo"
          defaultValue={employee?.legal_name_bank ?? ""}
        />
      </div>
      <div>
        <label className={labelClass}>Documento nacional de identidad</label>
        <Input
          name="identity_document"
          placeholder="Documento nacional de identidad"
          defaultValue={employee?.identity_document ?? ""}
        />
      </div>
      <div>
        <label className={labelClass}>Direccion</label>
        <Input name="address_line" placeholder="Direccion" defaultValue={employee?.address_line ?? ""} />
      </div>
      <div>
        <label className={labelClass}>Pais</label>
        <select name="address_country" defaultValue={employee?.address_country ?? ""} className={selectTeal}>
          <option value="">Pais</option>
          {countryOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Ciudad</label>
        <Input name="address_city" placeholder="Ciudad" defaultValue={employee?.address_city ?? ""} />
      </div>
      <div>
        <label className={labelClass}>Codigo postal</label>
        <Input
          name="address_postal_code"
          placeholder="Codigo postal"
          defaultValue={employee?.address_postal_code ?? ""}
        />
      </div>

      <SectionTitle>Opciones de pago</SectionTitle>
      <div>
        <label className={labelClass}>Opcion de pago</label>
        <select
          name="payment_method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as Employee["payment_method"])}
          className={selectTeal}
        >
          <option value="bank">Banco</option>
          <option value="paypal">PayPal</option>
          <option value="wise">Wise</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Correo PayPal</label>
        <Input
          name="paypal_email"
          type="email"
          placeholder="Correo PayPal"
          defaultValue={defaultPaypal}
        />
      </div>

      {paymentMethod === "wise" ? (
        <>
          <SectionTitle>Cuenta Wise</SectionTitle>
          <div className="md:col-span-2">
            <label className={labelClass}>Identificador Wise</label>
            <Input name="wise_account" placeholder="Cuenta o identificador Wise" defaultValue={defaultWise} />
          </div>
        </>
      ) : null}

      {paymentMethod === "bank" ? (
        <>
          <SectionTitle>Informacion bancaria</SectionTitle>
          <div>
            <label className={labelClass}>Nombre del banco</label>
            <Input name="bank_name" placeholder="Nombre del banco" defaultValue={employee?.bank_name ?? ""} />
          </div>
          <div>
            <label className={labelClass}>Cuenta bancaria</label>
            <Input
              name="bank_account_number"
              placeholder="Cuenta bancaria"
              defaultValue={defaultBankAccount}
            />
          </div>
          <div>
            <label className={labelClass}>SWIFT / BIC</label>
            <Input name="swift_bic" placeholder="SWIFT / BIC" defaultValue={employee?.swift_bic ?? ""} />
          </div>
          <div>
            <label className={labelClass}>Numero de ruta (ABA / routing)</label>
            <Input
              name="bank_route_number"
              placeholder="Numero de ruta"
              defaultValue={employee?.bank_route_number ?? ""}
            />
          </div>
        </>
      ) : null}

      <div className="md:col-span-2">
        <label className="mb-1 block text-sm text-zinc-700">Notas</label>
        <textarea
          name="notes"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-xs focus:border-lm-aqua focus:outline-none focus:ring-2 focus:ring-lm-sky"
          rows={4}
          defaultValue={employee?.notes ?? ""}
        />
      </div>

      <div className="md:col-span-2">
        <ConfirmSubmitButton type="submit" confirmMessage={confirmMessage}>
          {submitLabel}
        </ConfirmSubmitButton>
      </div>
    </form>
  );
}
