import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { importCollegeBoardQuestions } from "@/lib/importers/collegeboard";
import { importLocalSatPracticeAi } from "@/lib/importers/local-sat";

export async function POST(request: Request) {
  await requireAdmin();
  const formData = await request.formData();
  const mode = String(formData.get("mode") || "collegeboard");

  if (mode === "local-ai") {
    await importLocalSatPracticeAi();
    return NextResponse.redirect(new URL("/admin/import?mode=local-ai", request.url));
  }

  const limit = Number(formData.get("limit") || 40);
  await importCollegeBoardQuestions(limit);
  return NextResponse.redirect(new URL("/admin/import", request.url));
}
