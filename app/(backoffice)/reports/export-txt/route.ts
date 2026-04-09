import { NextResponse } from "next/server";

import {
  buildPaymentsTxt,
  getCurrentMonthParam,
  getPaymentPreview,
  getPayrollBonusExportLines,
} from "@/services/payments.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? getCurrentMonthParam();
    const rows = await getPaymentPreview(month);
    const bonusLines = await getPayrollBonusExportLines(month);
    const txt = buildPaymentsTxt(month, rows, bonusLines);

    return new NextResponse(txt, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="payroll-${month}.txt"`,
      },
    });
  } catch {
    return new NextResponse("No autorizado", { status: 403 });
  }
}
