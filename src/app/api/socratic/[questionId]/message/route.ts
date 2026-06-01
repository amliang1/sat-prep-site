import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSocraticReply } from "@/lib/socratic";
import { trackEvent } from "@/lib/analytics";

type RouteProps = {
  params: Promise<{ questionId: string }>;
};

const MAX_MESSAGE_CHARS = 1500;

export async function POST(request: Request, { params }: RouteProps) {
  const user = await requireUser();
  const { questionId } = await params;

  const body = await request.json().catch(() => null) as { message?: string } | null;
  const studentMessage = (body?.message ?? "").toString().trim().slice(0, MAX_MESSAGE_CHARS);
  if (!studentMessage) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { choices: { orderBy: { sortOrder: "asc" } } }
  });
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const conversation = await prisma.socraticConversation.upsert({
    where: { userId_questionId: { userId: user.id, questionId: question.id } },
    update: {},
    create: { userId: user.id, questionId: question.id }
  });

  const history = await prisma.socraticMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true }
  });

  let reply: string;
  try {
    reply = await generateSocraticReply({
      question,
      history,
      studentMessage
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tutor unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  await prisma.$transaction([
    prisma.socraticMessage.create({
      data: { conversationId: conversation.id, role: "user", content: studentMessage }
    }),
    prisma.socraticMessage.create({
      data: { conversationId: conversation.id, role: "assistant", content: reply }
    }),
    prisma.socraticConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() }
    })
  ]);

  await trackEvent({
    type: "QUESTION_VIEW",
    userId: user.id,
    questionId: question.id,
    metadata: { kind: "SOCRATIC_TURN", conversationId: conversation.id }
  });

  return NextResponse.json({ reply });
}
