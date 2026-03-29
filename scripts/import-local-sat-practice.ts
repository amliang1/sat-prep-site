import { execFileSync } from "node:child_process";
import { prisma } from "../src/lib/prisma";
import { applyImportedQuestionOverrides } from "../src/lib/imported-question-overrides";

type ParsedQuestion = {
  externalId: string;
  source: string;
  sourceUrl: string;
  testName: string;
  section: string;
  moduleNumber: number;
  domain: string;
  skill: string;
  difficulty: string;
  questionType: string;
  prompt: string;
  passage: string | null;
  choices: Array<{ label: string; text: string }>;
  answerKey: string;
  tags: string[];
};

async function importQuestions(questions: ParsedQuestion[]) {
  let imported = 0;

  for (const question of questions) {
    const normalizedQuestion = applyImportedQuestionOverrides(question);
    const tags = await Promise.all(
      normalizedQuestion.tags.map((name) =>
        prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name }
        })
      )
    );

    const existing = await prisma.question.findUnique({
      where: { externalId: normalizedQuestion.externalId }
    });

    const record = existing
      ? await prisma.question.update({
          where: { id: existing.id },
          data: {
            source: normalizedQuestion.source,
            sourceUrl: normalizedQuestion.sourceUrl,
            testName: normalizedQuestion.testName,
            section: normalizedQuestion.section,
            domain: normalizedQuestion.domain,
            skill: normalizedQuestion.skill,
            difficulty: normalizedQuestion.difficulty,
            questionType: normalizedQuestion.questionType,
            prompt: normalizedQuestion.prompt,
            passage: normalizedQuestion.passage,
            explanation: null
          }
        })
      : await prisma.question.create({
          data: {
            externalId: normalizedQuestion.externalId,
            source: normalizedQuestion.source,
            sourceUrl: normalizedQuestion.sourceUrl,
            testName: normalizedQuestion.testName,
            section: normalizedQuestion.section,
            domain: normalizedQuestion.domain,
            skill: normalizedQuestion.skill,
            difficulty: normalizedQuestion.difficulty,
            questionType: normalizedQuestion.questionType,
            prompt: normalizedQuestion.prompt,
            passage: normalizedQuestion.passage
          }
        });

    await prisma.questionChoice.deleteMany({ where: { questionId: record.id } });
    const createdChoices = await Promise.all(
      normalizedQuestion.choices.map((choice, index) =>
        prisma.questionChoice.create({
          data: {
            questionId: record.id,
            label: choice.label,
            text: choice.text,
            sortOrder: index
          }
        })
      )
    );

    const correctChoice = createdChoices.find((choice) => choice.label === normalizedQuestion.answerKey);

    await prisma.question.update({
      where: { id: record.id },
      data: {
        correctChoiceId: correctChoice?.id ?? null,
        correctTextAnswer: correctChoice ? null : normalizedQuestion.answerKey,
        tags: {
          deleteMany: {},
          create: tags.map((tag) => ({ tagId: tag.id }))
        }
      }
    });

    imported += 1;
  }

  return imported;
}

async function main() {
  const output = execFileSync("python3", ["scripts/parse_sat_practice_pdfs.py"], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  });

  const questions = JSON.parse(output) as ParsedQuestion[];
  const imported = await importQuestions(questions);
  console.log(`Imported ${imported} local SAT practice questions.`);
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
