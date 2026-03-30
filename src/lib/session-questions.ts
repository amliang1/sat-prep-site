import { prisma } from "@/lib/prisma";

type SessionQuestionSet = {
  sessionId: string;
  questionIds: string[];
  source?: string;
  label?: string;
};

const SESSION_QUESTION_SET_TYPE = "SESSION_QUESTION_SET";

export async function saveSessionQuestionSet(input: SessionQuestionSet & { userId: string }) {
  await prisma.analyticsEvent.create({
    data: {
      userId: input.userId,
      type: SESSION_QUESTION_SET_TYPE,
      metadata: JSON.stringify({
        sessionId: input.sessionId,
        questionIds: input.questionIds,
        source: input.source,
        label: input.label
      })
    }
  });
}

export async function getSessionQuestionSet(sessionId: string, userId: string) {
  const event = await prisma.analyticsEvent.findFirst({
    where: {
      userId,
      type: SESSION_QUESTION_SET_TYPE,
      metadata: {
        contains: `"sessionId":"${sessionId}"`
      }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!event?.metadata) {
    return null;
  }

  try {
    const parsed = JSON.parse(event.metadata) as SessionQuestionSet;
    return Array.isArray(parsed.questionIds) ? parsed : null;
  } catch {
    return null;
  }
}
