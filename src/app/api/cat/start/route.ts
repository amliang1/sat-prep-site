import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { Section } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const section = String(formData.get("section") || "MATH") as Section;
  const maxQuestions = Math.max(5, Math.min(40, Number(formData.get("maxQuestions") || 20)));
  const seTarget = Math.max(0.2, Math.min(0.6, Number(formData.get("seTarget") || 0.3)));

  const attempt = await prisma.adaptiveAttempt.create({
    data: {
      userId: user.id,
      section,
      maxQuestions,
      seTarget
    }
  });

  await trackEvent({
    type: "SESSION_STARTED",
    userId: user.id,
    metadata: { kind: "ADAPTIVE", attemptId: attempt.id, section, maxQuestions, seTarget }
  });

  return NextResponse.redirect(new URL(`/cat/${attempt.id}`, request.url));
}
