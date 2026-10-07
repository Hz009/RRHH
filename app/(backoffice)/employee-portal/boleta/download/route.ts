import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";

import type { PayslipLine } from "@/lib/payslip";
import { formatCurrency, formatDateOnlyLocal } from "@/lib/utils";
import { buildMyPayslip } from "@/services/payslip.service";

export const runtime = "nodejs";

const darkTeal = rgb(24 / 255, 110 / 255, 116 / 255);
const aqua = rgb(57 / 255, 180 / 255, 179 / 255);
const sky = rgb(237 / 255, 247 / 255, 247 / 255);
const ink = rgb(36 / 255, 66 / 255, 71 / 255);
const muted = rgb(90 / 255, 122 / 255, 126 / 255);
const white = rgb(1, 1, 1);

function pdfText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function drawLines(
  page: ReturnType<PDFDocument["addPage"]>,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  lines: PayslipLine[],
  x: number,
  startY: number,
  currency: string
) {
  let y = startY;
  for (const line of lines) {
    const comment = line.comment ? ` (${line.comment})` : "";
    const text = pdfText(`${line.label}${comment}`).slice(0, 42);
    page.drawText(text, { x, y, size: 9, font, color: ink });
    page.drawText(pdfText(formatCurrency(line.amount, currency)), { x: x + 108, y, size: 9, font, color: darkTeal });
    y -= 14;
  }
  return y;
}

export async function POST(request: Request) {
  const form = await request.formData();
  if (String(form.get("decision") ?? "") !== "accept") {
    return new NextResponse("Hay que aceptar la boleta antes de descargarla.", { status: 400 });
  }
  const month = String(form.get("month") ?? "");
  const payslip = await buildMyPayslip(month);
  if (!payslip) return new NextResponse("Mes no encontrado", { status: 404 });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(await readFile(path.join(process.cwd(), "public", "linguameeting-logo.png")));
  const logoWidth = 210;
  const logoHeight = (logo.height / logo.width) * logoWidth;

  page.drawRectangle({ x: 0, y: 776, width: 595.28, height: 66, color: sky });
  page.drawRectangle({ x: 0, y: 776, width: 595.28, height: 5, color: aqua });
  page.drawImage(logo, { x: 40, y: 792, width: logoWidth, height: logoHeight });

  page.drawText("BOLETA DE PAGO - EMPLEADOS", { x: 150, y: 748, size: 14, font: bold, color: darkTeal });

  const salary = payslip.hourly
    ? `${formatCurrency(payslip.contractedAmount, payslip.currency)} por hora`
    : formatCurrency(payslip.contractedAmount, payslip.currency);
  const facts = [
    `Empleado: ${payslip.fullName}`,
    `Cargo: ${payslip.jobTitle}`,
    `Sueldo basico: ${salary}`,
    `Salario por el mes de: ${payslip.periodLabel}`,
    `Fecha de ingreso: ${formatDateOnlyLocal(payslip.hireDate)}`,
    `Dias trabajados: ${payslip.daysWorked}    Dias no trabajados: ${payslip.daysNotWorked}`,
  ];
  facts.forEach((line, index) => {
    page.drawText(pdfText(line), { x: 40, y: 720 - index * 16, size: 10, font, color: ink });
  });

  const columns = [40, 230, 420];
  const titles = ["INGRESOS", "DESCUENTOS", "APORTES"];
  columns.forEach((x, index) => {
    page.drawRectangle({ x, y: 590, width: 165, height: 22, color: darkTeal });
    page.drawText(titles[index], { x: x + 8, y: 597, size: 10, font: bold, color: white });
  });

  page.drawText("Remuneracion basica", { x: 48, y: 570, size: 9, font, color: ink });
  page.drawText(pdfText(formatCurrency(payslip.basePay, payslip.currency)), { x: 148, y: 570, size: 9, font, color: darkTeal });
  const incomeLines = [
    ...payslip.bonuses.map((line) => ({ ...line, label: "Bono" })),
    ...payslip.incentives.map((line) => ({ ...line, label: `Incentivo ${line.label}` })),
  ];
  const incomeEnd = drawLines(page, font, incomeLines, 48, 554, payslip.currency);
  page.drawText(pdfText(`Total ingresos ${formatCurrency(payslip.totalIncome, payslip.currency)}`), {
    x: 48,
    y: Math.min(incomeEnd, 470) - 8,
    size: 9,
    font: bold,
    color: darkTeal,
  });

  const discountEnd = drawLines(page, font, [...payslip.discounts, ...payslip.loans], 238, 570, payslip.currency);
  page.drawText(pdfText(`Total descuento ${formatCurrency(payslip.totalDiscount, payslip.currency)}`), {
    x: 238,
    y: Math.min(discountEnd, 500) - 8,
    size: 9,
    font: bold,
    color: darkTeal,
  });

  page.drawText("Sin impuestos", { x: 428, y: 570, size: 9, font, color: muted });
  page.drawText(pdfText(`Total aporte ${formatCurrency(0, payslip.currency)}`), { x: 428, y: 548, size: 9, font: bold, color: darkTeal });

  page.drawText(pdfText(`LIQUIDO PAGABLE  ${formatCurrency(payslip.net, payslip.currency)}`), {
    x: 40,
    y: 400,
    size: 13,
    font: bold,
    color: darkTeal,
  });
  page.drawText("Pagador", { x: 80, y: 90, size: 9, font, color: muted });
  page.drawLine({ start: { x: 60, y: 108 }, end: { x: 200, y: 108 }, thickness: 0.6, color: muted });
  page.drawText("Conforme", { x: 360, y: 90, size: 9, font, color: muted });
  page.drawLine({ start: { x: 340, y: 108 }, end: { x: 480, y: 108 }, thickness: 0.6, color: muted });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="boleta-${payslip.periodMonth}.pdf"`,
    },
  });
}
