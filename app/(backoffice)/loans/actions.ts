"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAuditLog } from "@/services/audit.service";
import { approveLoan, createLoan, registerLoanRepayment, rejectLoan } from "@/services/loans.service";

export async function createLoanAction(formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  const loan = await createLoan(payload);

  await createAuditLog({
    module: "loans",
    action: "create",
    entityName: "employee_loans",
    entityId: loan.id,
    newData: loan,
  });

  revalidatePath("/loans");
  revalidatePath("/dashboard");
  redirect("/loans?loan=created");
}

export async function approveLoanAction(formData: FormData) {
  const loanId = String(formData.get("loan_id") ?? "");
  await approveLoan(loanId);

  await createAuditLog({
    module: "loans",
    action: "approve",
    entityName: "employee_loans",
    entityId: loanId,
    newData: { status: "active" },
  });

  revalidatePath("/loans");
  redirect("/loans?loan=approved");
}

export async function rejectLoanAction(formData: FormData) {
  const loanId = String(formData.get("loan_id") ?? "");
  await rejectLoan(loanId);

  await createAuditLog({
    module: "loans",
    action: "reject",
    entityName: "employee_loans",
    entityId: loanId,
    newData: { status: "cancelled" },
  });

  revalidatePath("/loans");
  redirect("/loans?loan=rejected");
}

export async function registerRepaymentAction(formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  await registerLoanRepayment(payload);

  await createAuditLog({
    module: "loans",
    action: "register_repayment",
    entityName: "loan_repayments",
    entityId: String(payload.loan_id ?? "unknown"),
    newData: payload,
  });

  revalidatePath("/loans");
  const returnTo = typeof payload.return_to === "string" ? payload.return_to : "/loans";
  const safeReturnTo = returnTo.startsWith("/loans") ? returnTo : "/loans";
  const separator = safeReturnTo.includes("?") ? "&" : "?";
  redirect(`${safeReturnTo}${separator}repayment=success`);
}
