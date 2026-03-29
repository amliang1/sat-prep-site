import { prisma } from "../src/lib/prisma";
import { normalizeImportedMathText } from "../src/lib/math-text";
import { applyImportedQuestionOverrides } from "../src/lib/imported-question-overrides";

async function main() {
  const questions = await prisma.question.findMany({
    where: {
      source: "Local SAT Practice PDF",
      section: "MATH"
    },
    include: {
      choices: true
    }
  });

  for (const question of questions) {
    const overridden = applyImportedQuestionOverrides({
      externalId: question.externalId ?? question.id,
      prompt: question.prompt,
      passage: question.passage,
      choices: question.choices.map((choice) => ({
        label: choice.label,
        text: choice.text
      }))
    });

    await prisma.question.update({
      where: { id: question.id },
      data: {
        prompt: normalizeImportedMathText(overridden.prompt),
        passage: overridden.passage ? normalizeImportedMathText(overridden.passage) : null
      }
    });

    for (const choice of question.choices) {
      const overriddenChoice = overridden.choices.find((item) => item.label === choice.label);
      await prisma.questionChoice.update({
        where: { id: choice.id },
        data: {
          text: normalizeImportedMathText(overriddenChoice?.text ?? choice.text)
        }
      });
    }
  }

  console.log(`Normalized ${questions.length} imported math questions.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
