/**
 * Socratic tutor — guides students with leading questions rather than handing
 * over the answer.  Calls the Gemini API with a constrained system prompt and
 * the running conversation history.
 */

import { Question, QuestionChoice, SocraticMessage } from "@prisma/client";

const MAX_OUTPUT_TOKENS = 320;
const TEMPERATURE = 0.6;

type GeminiPart = { text: string };
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

function buildSystemInstruction(
  question: Question & { choices: QuestionChoice[] }
): string {
  const choicesBlock = question.choices.length
    ? question.choices.map((c) => `${c.label}. ${c.text}`).join("\n")
    : "(student-response, no choices)";

  return `You are a Socratic SAT tutor. Your goal is to guide the student toward the correct answer without ever revealing it directly.

Rules — these are absolute:
1. Never state which answer choice is correct, even if the student asks. Instead respond with a question that points them toward the next reasoning step.
2. Never solve the problem in full. One small nudge at a time.
3. Ask one focused, leading question per turn. Two short sentences at most.
4. If the student answers your nudge correctly, affirm briefly and ask the next leading question.
5. If the student is stuck, ask them what concept or relationship they think the problem is testing.
6. If the student explicitly asks to give up or reveal the answer ("show me", "just tell me", "reveal"), respond with exactly: "Tap the reveal answer button below if you'd like to see the full explanation."
7. Use $...$ for inline math and $$...$$ for display math when helpful.

Question metadata:
- Section: ${question.section}
- Domain: ${question.domain}
- Skill: ${question.skill}

${question.passage ? `Passage:\n${question.passage}\n\n` : ""}Prompt:\n${question.prompt}

Choices:
${choicesBlock}

Correct answer (for your reference only — never reveal): ${question.correctChoiceId ?? question.correctTextAnswer ?? "(unknown)"}`;
}

function toGeminiHistory(messages: Pick<SocraticMessage, "role" | "content">[]): GeminiContent[] {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
}

export async function generateSocraticReply({
  question,
  history,
  studentMessage
}: {
  question: Question & { choices: QuestionChoice[] };
  history: Pick<SocraticMessage, "role" | "content">[];
  studentMessage: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const systemInstruction = buildSystemInstruction(question);
  const contents: GeminiContent[] = [
    ...toGeminiHistory(history),
    { role: "user", parts: [{ text: studentMessage }] }
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { role: "system", parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          temperature: TEMPERATURE
        }
      })
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error: ${errText}`);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const trimmed = text.trim();
  if (!trimmed) {
    return "Hmm — let me re-read the problem. What's the very first thing the prompt is actually asking for?";
  }
  return trimmed;
}
