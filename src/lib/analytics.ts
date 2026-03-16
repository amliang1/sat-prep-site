import { EventType } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function trackEvent(input: {
  type: EventType;
  userId?: string;
  questionId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.analyticsEvent.create({
    data: {
      type: input.type,
      userId: input.userId,
      questionId: input.questionId,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null
    }
  });
}
