import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month") ?? "";
  return NextResponse.redirect(new URL(`/employee-portal/boleta?month=${month}`, request.url));
}
