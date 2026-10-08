"use client";

import { useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";

import { BrandDialog } from "@/components/ui/brand-dialog";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { getCountryOptionsEs, matchPayrollSelectValue, payrollCurrencySelectOptions } from "@/lib/countries";
import { getPhonePrefixes } from "@/lib/phone-prefixes";
import {
  LINGUAMEETING_DEPARTMENTS,
  LINGUAMEETING_JOB_TITLES,
  selectOptionsFromCatalog,
} from "@/lib/employee-taxonomy";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types/domain";

const labelClass = "mb-1 flex min-h-10 items-end text-sm font-medium text-lm-dark-teal";

const selectTeal = cn(
  "h-11 w-full rounded-xl border border-lm-dark-teal/15 bg-white px-3 text-sm text-zinc-900",
  "focus:border-lm-aqua focus:outline-none focus:ring-2 focus:ring-lm-sky"
);

const selectNeutral = selectTeal;

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
  mode?: "admin" | "self";
  managerName?: string | null;
}

export function EmployeeForm({
  action,
  employee,
  employeeCode,
  managerOptions,
  defaultUserRole,
  submitLabel,
  confirmMessage,
  mode = "admin",
  managerName = null,
}: EmployeeFormProps) {
  const [state, formAction] = useFormState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const allowHighRate = useRef(false);
  const [rateWarning, setRateWarning] = useState(false);
  const [hireDate, setHireDate] = useState(employee?.hire_date ?? "");
  const [salaryEffectiveDate, setSalaryEffectiveDate] = useState(
    employee?.current_salary_effective_date ?? employee?.hire_date ?? ""
  );
  const [paymentMethod, setPaymentMethod] = useState(employee?.payment_method ?? "");
  const isSelf = mode === "self";
  const [employeeType, setEmployeeType] = useState(employee?.employee_type ?? "full_time");

  const countryOptions = useMemo(() => getCountryOptionsEs(), []);
  const phonePrefixes = useMemo(() => getPhonePrefixes(), []);
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

    if (employeeType === "hourly" && salaryAmount > 100 && !allowHighRate.current) {
      event.preventDefault();
      setRateWarning(true);
    }
  }

  function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="md:col-span-2 mt-2 text-sm font-semibold tracking-wide text-lm-dark-teal">{children}</h3>;
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <BrandDialog
        open={rateWarning}
        message="Aviso: este colaborador es de pago por horas y la tarifa supera 100 por hora. ¿Confirmas que deseas guardar este valor?"
        onCancel={() => setRateWarning(false)}
        onConfirm={() => {
          allowHighRate.current = true;
          setRateWarning(false);
          formRef.current?.requestSubmit();
        }}
      />
      {employee ? <input type="hidden" name="id" value={employee.id} /> : null}

      {state?.error ? (
        <div className="md:col-span-2 rounded-xl border border-lm-orange/40 bg-lm-orange-light p-3">
          <p className="text-sm text-lm-orange">{state.error}</p>
        </div>
      ) : null}

      <div>
        <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">Codigo</label>
        <Input value={employeeCode} readOnly disabled />
      </div>
      <div>
        <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">Nombre</label>
        <Input name="first_name" required defaultValue={defaultFirstName} />
      </div>
      <div>
        <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">Apellido</label>
        <Input name="last_name" required defaultValue={defaultLastName} />
      </div>
      <div>
        <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">Email</label>
        <Input name="email" type="email" required defaultValue={employee?.email} />
      </div>
      <div>
        <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">Teléfono</label>
        <div className="flex gap-2">
          <select name="phone_prefix" defaultValue={employee?.phone_prefix ?? ""} className={cn(selectNeutral, "w-40 shrink-0")}>
            <option value="">Prefijo</option>
            {phonePrefixes.map((prefix) => (
              <option key={`${prefix.label}-${prefix.value}`} value={prefix.value}>
                {prefix.label}
              </option>
            ))}
          </select>
          <Input name="phone" defaultValue={employee?.phone ?? ""} placeholder="Número" />
        </div>
      </div>
      <div>
        <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">WhatsApp</label>
        <div className="flex gap-2">
          <select name="whatsapp_prefix" defaultValue={employee?.whatsapp_prefix ?? ""} className={cn(selectNeutral, "w-40 shrink-0")}>
            <option value="">Prefijo</option>
            {phonePrefixes.map((prefix) => (
              <option key={`wa-${prefix.label}-${prefix.value}`} value={prefix.value}>
                {prefix.label}
              </option>
            ))}
          </select>
          <Input name="whatsapp_number" defaultValue={employee?.whatsapp_number ?? ""} placeholder="Número" />
        </div>
      </div>
      {isSelf && employee ? (
        <div className="md:col-span-2 rounded-2xl border border-lm-aqua/25 bg-lm-sky/70 p-4 text-sm text-lm-dark-teal">
          <p className="font-semibold">Datos laborales</p>
          <p className="mt-2">Manager: {managerName || "Sin manager"}</p>
          <p>Departamento: {employee.department}</p>
          <p>Cargo: {employee.job_title}</p>
          <p>Tipo: {employee.employee_type === "hourly" ? "Por horas" : employee.employee_type === "part_time" ? "Part time" : "Full time"}</p>
          <p>Estado: {employee.employment_status === "on_leave" ? "De baja" : employee.employment_status === "inactive" ? "Inactivo" : "Activo"}</p>
          <p>Fecha de contratacion: {employee.hire_date}</p>
          <p>
            {employee.employee_type === "hourly" ? "Tarifa por hora" : "Salario actual"}: {employee.current_salary_amount}{" "}
            {employee.current_salary_currency}
          </p>
        </div>
      ) : null}
      {employee && !isSelf ? (
        <>
          <input type="hidden" name="department" value={employee.department} />
          <input type="hidden" name="job_title" value={employee.job_title} />
          <input type="hidden" name="employee_type" value={employee.employee_type} />
          <input type="hidden" name="hourly_hours_source" value={employee.hourly_hours_source ?? "manual_monthly"} />
          <input type="hidden" name="hire_date" value={employee.hire_date} />
          <input type="hidden" name="employment_status" value={employee.employment_status} />
          <input type="hidden" name="vacation_days_per_year" value={String(employee.vacation_days_per_year)} />
          <input type="hidden" name="current_salary_amount" value={String(employee.current_salary_amount)} />
          <input type="hidden" name="current_salary_currency" value={employee.current_salary_currency} />
          <input type="hidden" name="current_salary_effective_date" value={employee.current_salary_effective_date ?? employee.hire_date} />
          <input type="hidden" name="user_role" value={defaultUserRole} />
          <div className="md:col-span-2 rounded-2xl border border-lm-aqua/25 bg-lm-sky/70 p-4 text-sm text-lm-dark-teal">
            <p className="font-semibold">Datos que cambian con el tiempo</p>
            <p className="mt-1 text-xs">Se ven aquí actualizados. El salario, el cargo, el departamento, el estado y el tipo se cambian en su historial.</p>
            <p className="mt-2">Departamento: {employee.department}</p>
            <p>Cargo: {employee.job_title}</p>
            <p>Tipo de empleado: {employee.employee_type === "hourly" ? "Por horas" : employee.employee_type === "part_time" ? "Part time" : "Full time"}</p>
            <p>Cuenta: {defaultUserRole === "manager" ? "Manager" : "Empleado"}</p>
            <p>Estado: {employee.employment_status === "on_leave" ? "De baja" : employee.employment_status === "inactive" ? "Inactivo" : "Activo"}</p>
            <p>Fecha de contratacion: {employee.hire_date}</p>
            <p>
              {employee.employee_type === "hourly" ? "Tarifa por hora" : "Salario actual"}: {employee.current_salary_amount}{" "}
              {employee.current_salary_currency}
            </p>
          </div>
          <div>
            <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">Manager asignado</label>
            <select name="manager_id" defaultValue={employee.manager_id ?? ""} className={selectNeutral}>
              <option value="">Sin manager</option>
              {managerOptions
                .filter((manager) => manager.id !== employee.id)
                .map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.full_name} ({manager.email})
                  </option>
                ))}
            </select>
          </div>
        </>
      ) : null}
      {!employee ? <>
      <div>
        <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">Departamento</label>
        <select
          name="department"
          required
          defaultValue=""
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
        <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">Cargo</label>
        <select
          name="job_title"
          required
          defaultValue=""
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
        <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">Tipo de empleado</label>
        <select
          name="user_role"
          defaultValue={defaultUserRole}
          className={selectNeutral}
        >
          <option value="employee">Empleado</option>
          <option value="manager">Manager</option>
        </select>
      </div>
      </> : null}
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
      {!employee ? <>
      <div>
        <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">Tipo de usuario</label>
        <select
          name="employee_type"
          value={employeeType}
          onChange={(e) => setEmployeeType(e.target.value as typeof employeeType)}
          className={selectNeutral}
        >
          <option value="full_time">Full time</option>
          <option value="part_time">Part time</option>
          <option value="hourly">Hourly</option>
        </select>
      </div>
      {employeeType === "hourly" ? (
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-lm-dark-teal">
            Como se registran las horas (solo por horas)
          </label>
          <select
            name="hourly_hours_source"
            defaultValue="manual_monthly"
            className={selectNeutral}
          >
            <option value="manual_monthly">Horas mensuales cargadas por administracion (ej. coaches)</option>
            <option value="punch">Fichaje de entrada y salida por el empleado</option>
          </select>
        </div>
      ) : null}
      <div>
        <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">Manager asignado</label>
        <select name="manager_id" defaultValue="" className={selectNeutral}>
          <option value="">Sin manager</option>
          {managerOptions
            .filter((manager) => manager.id)
            .map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.full_name} ({manager.email})
              </option>
            ))}
        </select>
      </div>
      <div>
        <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">Fecha de contratacion</label>
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
        <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">Estado</label>
        <select
          name="employment_status"
          defaultValue="active"
          className={selectNeutral}
        >
          <option value="active">Activo</option>
          <option value="on_leave">De baja</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>
      <div>
        <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">
          {employeeType === "hourly" ? "Tarifa por hora" : employee ? "Salario actual" : "Salario inicial"}
        </label>
        <Input
          name="current_salary_amount"
          type="number"
          step="0.01"
          min="0"
          defaultValue={0}
        />
        {employeeType === "hourly" ? (
          <p className="mt-1 text-xs text-zinc-500">Es el precio por hora.</p>
        ) : !employee ? (
          <p className="mt-1 text-xs text-zinc-500">Es el primer sueldo. Después se ve como salario actual.</p>
        ) : null}
      </div>
      <div>
        <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">Moneda (sueldo, factura y bonos)</label>
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
        <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">Fecha de inicio</label>
        <Input
          name="current_salary_effective_date"
          type="date"
          value={salaryEffectiveDate}
          onChange={(event) => setSalaryEffectiveDate(event.target.value)}
        />
        <p className="mt-1 text-xs text-zinc-500">Por defecto es la fecha del primer salario.</p>
      </div>
      {employeeType === "hourly" ? null : (
      <div>
        <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">Días de vacaciones</label>
        <Input
          name="vacation_days_per_year"
          type="number"
          min="0"
          defaultValue={30}
        />
        <p className="mt-1 text-xs text-zinc-500">Por defecto 30. Se puede cambiar, por ejemplo a 15 o 20.</p>
      </div>
      )}
      </> : null}

      <SectionTitle>Titular y domicilio (como en banco o documento de identidad)</SectionTitle>
      <div className="md:col-span-2">
        <label className={labelClass}>
          Nombre completo (como figura en tu banco o pasaporte / DNI)
        </label>
        <Input
          name="legal_name_bank"
          placeholder="Nombre completo"
          required={isSelf}
          defaultValue={employee?.legal_name_bank ?? ""}
        />
      </div>
      <div>
        <label className={labelClass}>Documento nacional de identidad</label>
        <Input
          name="identity_document"
          placeholder="Documento nacional de identidad"
          required={isSelf}
          defaultValue={employee?.identity_document ?? ""}
        />
      </div>
      <div>
        <label className={labelClass}>Direccion</label>
        <Input name="address_line" placeholder="Dirección" required={isSelf} defaultValue={employee?.address_line ?? ""} />
      </div>
      <div>
        <label className={labelClass}>Pais</label>
        <select name="address_country" required={isSelf} defaultValue={employee?.address_country ?? ""} className={selectTeal}>
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
        <Input name="address_city" placeholder="Ciudad" required={isSelf} defaultValue={employee?.address_city ?? ""} />
      </div>
      <div>
        <label className={labelClass}>Codigo postal</label>
        <Input
          name="address_postal_code"
          placeholder="Código postal"
          required={isSelf}
          defaultValue={employee?.address_postal_code ?? ""}
        />
      </div>

      <SectionTitle>Opciones de pago</SectionTitle>
      <div>
        <label className={labelClass}>Opción de pago</label>
        <select
          name="payment_method"
          required={isSelf}
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className={cn(selectTeal, !paymentMethod && "text-zinc-400")}
        >
          <option value="" disabled>
            Seleccionar opción
          </option>
          <option value="bank">Transferencia bancaria</option>
          <option value="paypal">PayPal</option>
          <option value="wise">Wise</option>
        </select>
      </div>
      <div className={paymentMethod === "paypal" || paymentMethod === "wise" ? "" : "hidden md:block"}>
        {paymentMethod === "paypal" ? (
          <>
            <label className={labelClass}>Correo PayPal</label>
            <Input
              name="paypal_email"
              type="email"
              placeholder="Correo PayPal"
              required={isSelf}
              defaultValue={defaultPaypal}
            />
          </>
        ) : null}
        {paymentMethod === "wise" ? (
          <>
            <label className={labelClass}>Correo Wise</label>
            <Input name="wise_account" type="email" required={isSelf} placeholder="Correo Wise" defaultValue={defaultWise} />
          </>
        ) : null}
      </div>

      {paymentMethod === "bank" ? (
        <>
          <SectionTitle>Información bancaria</SectionTitle>
          <div>
            <label className={labelClass}>Tipo de cuenta</label>
            <select
              name="bank_account_type"
              required={isSelf}
              defaultValue={employee?.bank_account_type ?? ""}
              className={cn(selectTeal, !employee?.bank_account_type && "text-zinc-400")}
            >
              <option value="" disabled>
                Seleccionar opción
              </option>
              <option value="savings">Cuenta de ahorros</option>
              <option value="checking">Cuenta corriente</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Nombre del banco</label>
            <Input name="bank_name" required={isSelf} placeholder="Nombre del banco" defaultValue={employee?.bank_name ?? ""} />
          </div>
          <div>
            <label className={labelClass}>Cuenta bancaria</label>
            <Input
              name="bank_account_number"
              required={isSelf}
              placeholder="Cuenta bancaria"
              defaultValue={defaultBankAccount}
            />
          </div>
          <div>
            <label className={labelClass}>SWIFT / BIC</label>
            <Input name="swift_bic" placeholder="SWIFT / BIC" defaultValue={employee?.swift_bic ?? ""} />
          </div>
          <div>
            <label className={labelClass}>Número de ruta (ABA / routing)</label>
            <Input
              name="bank_route_number"
              placeholder="Número de ruta"
              defaultValue={employee?.bank_route_number ?? ""}
            />
          </div>
        </>
      ) : null}

      <div className="md:col-span-2">
        <label className="mb-1 flex min-h-10 items-end text-sm text-zinc-700">Notas</label>
        <textarea
          name="notes"
          placeholder="Indicar dirección actual de tu cuenta"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-xs placeholder:text-zinc-400 focus:border-lm-aqua focus:outline-none focus:ring-2 focus:ring-lm-sky"
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
