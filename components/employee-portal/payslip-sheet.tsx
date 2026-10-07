import type { PayslipLine } from "@/lib/payslip";
import { formatCurrency, formatDateOnlyLocal } from "@/lib/utils";
import type { Payslip } from "@/services/payslip.service";

function money(amount: number, currency: string) {
  return formatCurrency(amount, currency);
}

function Lines({ lines, currency, empty }: { lines: PayslipLine[]; currency: string; empty: string }) {
  if (lines.length === 0) return empty ? <p className="text-sm text-zinc-400">{empty}</p> : null;
  return (
    <ul className="space-y-2 text-sm">
      {lines.map((line, index) => (
        <li key={`${line.label}-${index}`} className="flex items-start justify-between gap-3">
          <span>
            <span className="font-medium text-zinc-800">{line.label}</span>
            {line.comment ? <span className="mt-0.5 block text-xs text-zinc-500">{line.comment}</span> : null}
          </span>
          <span className="shrink-0 font-medium text-lm-dark-teal">{money(line.amount, currency)}</span>
        </li>
      ))}
    </ul>
  );
}

export function PayslipSheet({ payslip }: { payslip: Payslip }) {
  const salaryLine = payslip.hourly
    ? `${money(payslip.contractedAmount, payslip.currency)} por hora`
    : money(payslip.contractedAmount, payslip.currency);

  return (
    <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-lm-aqua/30 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-4 bg-lm-sky px-6 py-5">
        <img src="/linguameeting-logo.png" alt="LinguaMeeting" className="h-10 w-auto" />
        <p className="text-right text-xs font-semibold uppercase tracking-widest text-lm-aqua">Recursos Humanos</p>
      </header>
      <div className="h-1.5 bg-lm-aqua" />
      <div className="space-y-6 px-6 py-6">
        <h2 className="text-center text-lg font-semibold tracking-wide text-lm-dark-teal">BOLETA DE PAGO — EMPLEADOS</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-xs uppercase text-zinc-500">Empleado</dt><dd className="font-medium">{payslip.fullName}</dd></div>
          <div><dt className="text-xs uppercase text-zinc-500">Cargo</dt><dd>{payslip.jobTitle}</dd></div>
          <div><dt className="text-xs uppercase text-zinc-500">Sueldo básico</dt><dd>{salaryLine}</dd></div>
          <div><dt className="text-xs uppercase text-zinc-500">Salario por el mes de</dt><dd className="capitalize">{payslip.periodLabel}</dd></div>
          <div><dt className="text-xs uppercase text-zinc-500">Fecha de ingreso</dt><dd>{formatDateOnlyLocal(payslip.hireDate)}</dd></div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Días</dt>
            <dd>{payslip.daysWorked} trabajados · {payslip.daysNotWorked} no trabajados</dd>
          </div>
        </dl>

        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-xl border border-lm-aqua/20 p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">
              <span className="block rounded-md bg-lm-dark-teal px-3 py-2">Ingresos</span>
            </h3>
            <ul className="mb-3 space-y-2 text-sm">
              <li className="flex justify-between gap-3">
                <span>Remuneración básica</span>
                <span className="font-medium">{money(payslip.basePay, payslip.currency)}</span>
              </li>
            </ul>
            <Lines lines={payslip.bonuses} currency={payslip.currency} empty="" />
            <Lines lines={payslip.incentives.map((line) => ({ ...line, label: `Incentivo · ${line.label}` }))} currency={payslip.currency} empty="Sin incentivos" />
            <p className="mt-4 border-t border-lm-aqua/30 pt-2 text-sm font-semibold text-lm-dark-teal">
              Total ingresos {money(payslip.totalIncome, payslip.currency)}
            </p>
          </section>
          <section className="rounded-xl border border-lm-aqua/20 p-4">
            <h3 className="mb-3 text-sm font-semibold">
              <span className="block rounded-md bg-lm-dark-teal px-3 py-2 text-white">Descuentos</span>
            </h3>
            <Lines lines={[...payslip.discounts, ...payslip.loans]} currency={payslip.currency} empty="Sin descuentos" />
            <p className="mt-4 border-t border-lm-aqua/30 pt-2 text-sm font-semibold text-lm-dark-teal">
              Total descuento {money(payslip.totalDiscount, payslip.currency)}
            </p>
          </section>
          <section className="rounded-xl border border-lm-aqua/20 p-4">
            <h3 className="mb-3 text-sm font-semibold">
              <span className="block rounded-md bg-lm-dark-teal px-3 py-2 text-white">Aportes</span>
            </h3>
            <p className="text-sm text-zinc-500">Sin impuestos ni aportes en esta boleta.</p>
            <p className="mt-4 border-t border-lm-aqua/30 pt-2 text-sm font-semibold text-lm-dark-teal">
              Total aporte {money(0, payslip.currency)}
            </p>
          </section>
        </div>

        <p className="text-lg font-semibold text-lm-dark-teal">
          Líquido pagable {money(payslip.net, payslip.currency)}
        </p>
        <div className="grid gap-8 pt-8 text-center text-xs uppercase tracking-wide text-zinc-500 sm:grid-cols-2">
          <p className="border-t border-zinc-300 pt-2">Pagador</p>
          <p className="border-t border-zinc-300 pt-2">Conforme</p>
        </div>
      </div>
    </article>
  );
}
