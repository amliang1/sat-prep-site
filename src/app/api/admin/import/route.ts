import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { importCollegeBoardQuestions } from "@/lib/importers/collegeboard";

export async function POST(request: Request) {
  await requireAdmin();
  const formData = await request.formData();
  const limit = Number(formData.get("limit") || 40);
  await importCollegeBoardQuestions(limit);
  return NextResponse.redirect(new URL("/admin/import", request.url));
}
