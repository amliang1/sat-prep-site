import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/user/settings
 * Updates gamification fields: targetScore and testDate.
 */
export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();

  const targetScore = formData.get("targetScore");
  const testDate = formData.get("testDate");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      targetScore: targetScore ? Number(targetScore) : undefined,
      testDate: testDate ? new Date(String(testDate)) : undefined
    }
  });

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
