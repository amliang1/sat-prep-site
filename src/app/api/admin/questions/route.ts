import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/questions
 * Creates a new question with choices from the admin WYSIWYG editor.
 */
export async function POST(request: Request) {
  await requireAdmin();
  const formData = await request.formData();

  const section = String(formData.get("section") ?? "READING_WRITING");
  const domain = String(formData.get("domain") ?? "").trim();
  const skill = String(formData.get("skill") ?? "").trim();
  const difficulty = String(formData.get("difficulty") ?? "MEDIUM");
  const questionType = String(formData.get("questionType") ?? "MULTIPLE_CHOICE");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const passage = formData.get("passage") ? String(formData.get("passage")).trim() : null;
  const explanation = formData.get("explanation") ? String(formData.get("explanation")).trim() : null;
  const correctTextAnswer = questionType === "STUDENT_RESPONSE" ? String(formData.get("correctTextAnswer") ?? "").trim() : null;

  // Choices: choiceA, choiceB, choiceC, choiceD, correctChoice
  const choiceLabels = ["A", "B", "C", "D"];
  const choiceTexts = choiceLabels.map((l) => String(formData.get(`choice${l}`) ?? "").trim());
  const correctChoiceLabel = String(formData.get("correctChoice") ?? "A");

  const question = await prisma.question.create({
    data: {
      source: "MANUAL",
      section,
      domain,
      skill,
      difficulty,
      questionType,
      prompt,
      passage,
      explanation,
      correctTextAnswer,
      choices:
        questionType === "MULTIPLE_CHOICE"
          ? {
              create: choiceLabels.map((label, i) => ({
                label,
                text: choiceTexts[i],
                sortOrder: i
              }))
            }
          : undefined
    },
    include: { choices: true }
  });

  // Set correctChoiceId after choices are created
  if (questionType === "MULTIPLE_CHOICE") {
    const correctChoice = question.choices.find((c) => c.label === correctChoiceLabel);
    if (correctChoice) {
      await prisma.question.update({
        where: { id: question.id },
        data: { correctChoiceId: correctChoice.id }
      });
    }
  }

  return NextResponse.redirect(new URL(`/admin/questions/create?success=${question.id}`, request.url));
}
