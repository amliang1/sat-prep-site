import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { applyImportedQuestionOverrides } from "@/lib/imported-question-overrides";

export type ImportedSatQuestion = {
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

type AiImportCheckpoint = {
  totalQuestions: number;
  completedExternalIds: string[];
  updatedAt: string;
};

const AI_IMPORT_BATCH_SIZE = 5;
const AI_IMPORT_CHECKPOINT_PATH = path.join(process.cwd(), ".sat-ai-import-checkpoint.json");

export async function upsertImportedSatQuestions(questions: ImportedSatQuestion[]) {
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

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function readAiImportCheckpoint(totalQuestions: number) {
  if (!existsSync(AI_IMPORT_CHECKPOINT_PATH)) {
    return {
      totalQuestions,
      completedExternalIds: [],
      updatedAt: new Date().toISOString()
    } satisfies AiImportCheckpoint;
  }

  try {
    const raw = readFileSync(AI_IMPORT_CHECKPOINT_PATH, "utf8");
    const parsed = JSON.parse(raw) as AiImportCheckpoint;
    if (!Array.isArray(parsed.completedExternalIds) || parsed.totalQuestions !== totalQuestions) {
      return {
        totalQuestions,
        completedExternalIds: [],
        updatedAt: new Date().toISOString()
      } satisfies AiImportCheckpoint;
    }
    return parsed;
  } catch {
    return {
      totalQuestions,
      completedExternalIds: [],
      updatedAt: new Date().toISOString()
    } satisfies AiImportCheckpoint;
  }
}

function writeAiImportCheckpoint(checkpoint: AiImportCheckpoint) {
  writeFileSync(AI_IMPORT_CHECKPOINT_PATH, `${JSON.stringify(checkpoint, null, 2)}\n`, "utf8");
}

function clearAiImportCheckpoint() {
  if (existsSync(AI_IMPORT_CHECKPOINT_PATH)) {
    unlinkSync(AI_IMPORT_CHECKPOINT_PATH);
  }
}

function normalizeImportedQuestion(question: ImportedSatQuestion): ImportedSatQuestion {
  return {
    ...question,
    prompt: question.prompt.trim(),
    passage: question.passage?.trim() || null,
    domain: question.domain.trim(),
    skill: question.skill.trim(),
    choices: question.choices.map((choice) => ({
      label: choice.label.trim().toUpperCase(),
      text: choice.text.trim()
    }))
  };
}

async function callOpenRouterBatch(questions: ImportedSatQuestion[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "google/gemini-3.1-pro-preview";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required for AI SAT import");
  }

  const prompt = [
    "You are cleaning and classifying SAT practice questions extracted from official PDFs.",
    "Return valid JSON only with schema {\"questions\":[...]} where each item includes:",
    "externalId, prompt, passage, domain, skill, questionType, choices.",
    "Rules:",
    "- Preserve wording faithfully while cleaning line breaks and spacing.",
    "- Remove duplicated question numbers from the prompt.",
    "- Keep passage null unless there is clearly shared passage text.",
    "- Do not change the number of choices or their labels.",
    "- Keep questionType unchanged.",
    "- Domain must be one of: Information and Ideas, Craft and Structure, Expression of Ideas, Standard English Conventions, Algebra, Advanced Math, Problem-Solving and Data Analysis, Geometry and Trigonometry.",
    "- Skill should be a short SAT-style skill label.",
    "",
    JSON.stringify({
      questions: questions.map((question) => ({
        externalId: question.externalId,
        prompt: question.prompt,
        passage: question.passage,
        questionType: question.questionType,
        section: question.section,
        choices: question.choices
      }))
    })
  ].join("\n");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(120_000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "SAT Forge Importer"
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed: ${await response.text()}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter returned no content");
  }

  const parsed = JSON.parse(content) as {
    questions?: Array<{
      externalId: string;
      prompt: string;
      passage: string | null;
      domain: string;
      skill: string;
      questionType: string;
      choices: Array<{ label: string; text: string }>;
    }>;
  };

  return parsed.questions ?? [];
}

export async function importLocalSatPracticeAi() {
  const output = execFileSync("python3", ["scripts/parse_sat_practice_pdfs.py"], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    env: process.env
  });

  const baseQuestions = (JSON.parse(output) as ImportedSatQuestion[]).map(normalizeImportedQuestion);
  const checkpoint = readAiImportCheckpoint(baseQuestions.length);
  const completedIds = new Set(checkpoint.completedExternalIds);
  const pendingQuestions = baseQuestions.filter((question) => !completedIds.has(question.externalId));
  let imported = 0;

  console.log(
    `AI SAT import starting with ${baseQuestions.length} extracted questions. ` +
      `${completedIds.size} already completed, ${pendingQuestions.length} remaining.`
  );

  for (const [batchIndex, batch] of chunk(pendingQuestions, AI_IMPORT_BATCH_SIZE).entries()) {
    console.log(
      `Processing AI batch ${batchIndex + 1}/${Math.max(1, Math.ceil(pendingQuestions.length / AI_IMPORT_BATCH_SIZE))} ` +
        `(${batch.length} questions)...`
    );
    const enhancedBatch = await callOpenRouterBatch(batch);
    const enhancedBatchById = new Map(enhancedBatch.map((item) => [item.externalId, item]));
    const finalizedBatch = batch.map((original) => {
      const item = enhancedBatchById.get(original.externalId);
      return normalizeImportedQuestion({
        ...original,
        prompt: item?.prompt || original.prompt,
        passage: item?.passage ?? original.passage,
        domain: item?.domain || original.domain,
        skill: item?.skill || original.skill,
        questionType: item?.questionType || original.questionType,
        choices:
          original.questionType === "MULTIPLE_CHOICE" &&
          Array.isArray(item?.choices) &&
          item.choices.length === original.choices.length
            ? item.choices
            : original.choices,
        source: "AI Parsed SAT Practice PDF",
        tags: Array.from(new Set([...original.tags, "ai-imported-pdf"]))
      });
    });

    imported += await upsertImportedSatQuestions(finalizedBatch);

    for (const question of finalizedBatch) {
      completedIds.add(question.externalId);
    }

    writeAiImportCheckpoint({
      totalQuestions: baseQuestions.length,
      completedExternalIds: [...completedIds],
      updatedAt: new Date().toISOString()
    });

    console.log(
      `Finished batch ${batchIndex + 1}. ` +
        `${completedIds.size}/${baseQuestions.length} questions persisted so far.`
    );
  }

  clearAiImportCheckpoint();
  return { imported, totalParsed: baseQuestions.length };
}
