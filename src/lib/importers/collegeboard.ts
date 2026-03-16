import { Prisma } from "@prisma/client";
import { Difficulty, Section } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export type ImportResult = {
  imported: number;
  skipped: number;
};

type ImportedQuestion = {
  externalId: string;
  source: string;
  sourceUrl: string;
  testName: string;
  section: Section;
  domain: string;
  skill: string;
  difficulty: Difficulty;
  prompt: string;
  passage?: string;
  explanation?: string;
  choices: Array<{ label: string; text: string }>;
  answerLabel: string;
  tags: string[];
};

type QuestionBankQuestion = {
  id: string;
  question?: string;
  stimulus?: string;
  rationales?: string[];
  answerOptions?: Array<{ id?: string; content?: string; position?: number; label?: string }>;
  correctAnswerId?: string;
  domain?: string;
  skill?: string;
  difficulty?: string;
  section?: string;
  test?: string;
};

const QUESTION_BANK_URL =
  "https://satsuitequestionbank.collegeboard.org/media/question-bank/all.json";

function mapDifficulty(value?: string): Difficulty {
  const raw = (value ?? "").toLowerCase();
  if (raw.includes("hard")) {
    return "HARD";
  }
  if (raw.includes("easy")) {
    return "EASY";
  }
  return "MEDIUM";
}

function mapSection(value?: string): Section {
  const raw = (value ?? "").toLowerCase();
  return raw.includes("reading") ? "READING_WRITING" : "MATH";
}

function normalizeQuestion(item: QuestionBankQuestion): ImportedQuestion | null {
  if (!item.id || !item.question || !item.answerOptions?.length || !item.correctAnswerId) {
    return null;
  }

  const choices = item.answerOptions
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((choice, index) => ({
      label: choice.label ?? String.fromCharCode(65 + index),
      text: choice.content ?? ""
    }))
    .filter((choice) => choice.text);

  const correctChoice = item.answerOptions.find((choice) => choice.id === item.correctAnswerId);
  if (!choices.length || !correctChoice) {
    return null;
  }

  const tags = [item.domain, item.skill, item.test].filter(Boolean) as string[];

  return {
    externalId: item.id,
    source: "College Board Question Bank",
    sourceUrl: QUESTION_BANK_URL,
    testName: item.test ?? "College Board SAT Suite Question Bank",
    section: mapSection(item.section),
    domain: item.domain ?? "Uncategorized",
    skill: item.skill ?? "General",
    difficulty: mapDifficulty(item.difficulty),
    prompt: item.question,
    passage: item.stimulus,
    explanation: item.rationales?.join("\n\n"),
    choices,
    answerLabel: correctChoice.label ?? "A",
    tags
  };
}

async function upsertQuestion(question: ImportedQuestion) {
  const tags = await Promise.all(
    question.tags.map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name }
      })
    )
  );

  const existing = await prisma.question.findUnique({
    where: { externalId: question.externalId },
    include: { choices: true }
  });

  const data: Prisma.QuestionUncheckedCreateInput = {
    externalId: question.externalId,
    source: question.source,
    sourceUrl: question.sourceUrl,
    testName: question.testName,
    section: question.section,
    domain: question.domain,
    skill: question.skill,
    difficulty: question.difficulty,
    prompt: question.prompt,
    passage: question.passage,
    explanation: question.explanation
  };

  const record = existing
    ? await prisma.question.update({
        where: { id: existing.id },
        data
      })
    : await prisma.question.create({ data });

  await prisma.questionChoice.deleteMany({ where: { questionId: record.id } });
  const createdChoices = await Promise.all(
    question.choices.map((choice, index) =>
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

  const correct = createdChoices.find((choice) => choice.label === question.answerLabel);
  await prisma.question.update({
    where: { id: record.id },
    data: {
      correctChoiceId: correct?.id,
      tags: {
        deleteMany: {},
        create: tags.map((tag) => ({
          tagId: tag.id
        }))
      }
    }
  });
}

export async function importCollegeBoardQuestions(limit = 40): Promise<ImportResult> {
  const response = await fetch(QUESTION_BANK_URL, {
    headers: {
      "User-Agent": "sat-prep-site-importer"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Question bank request failed with ${response.status}`);
  }

  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : payload?.questions ?? [];

  let imported = 0;
  let skipped = 0;

  for (const row of rows.slice(0, limit)) {
    const normalized = normalizeQuestion(row as QuestionBankQuestion);
    if (!normalized) {
      skipped += 1;
      continue;
    }

    await upsertQuestion(normalized);
    imported += 1;
  }

  return { imported, skipped };
}
