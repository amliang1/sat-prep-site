import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/generate-explanation
 * Uses the Gemini API to generate a step-by-step explanation for a question.
 * Expects JSON body: { prompt, passage?, choices, correctChoice }
 */
export async function POST(request: Request) {
  await requireAdmin();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const body = await request.json();
  const { prompt: questionPrompt, passage, choices, correctChoice } = body as {
    prompt: string;
    passage?: string;
    choices: string;
    correctChoice: string;
  };

  const systemPrompt = `You are an expert SAT tutor. Generate a clear, concise step-by-step explanation for why answer choice ${correctChoice} is correct.
Your explanation should:
- Be 3-5 sentences maximum
- Reference the specific reasoning required
- Use simple language accessible to high school students
- Use $LaTeX$ notation for any math expressions (inline: $...$ , display: $$...$$)
- NOT just say "the answer is X" — actually explain WHY

${passage ? `Passage context:\n${passage}\n\n` : ""}Question: ${questionPrompt}

Answer choices:
${choices}

Correct answer: ${correctChoice}

Provide ONLY the explanation text, no preamble.`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { maxOutputTokens: 400, temperature: 0.4 }
      })
    }
  );

  if (!geminiRes.ok) {
    const err = await geminiRes.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }

  const geminiData = await geminiRes.json();
  const explanation = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Optionally update any existing question that matches (not required at this step – explanation
  // comes back to the client so the editor can include it in the submit form)
  return NextResponse.json({ explanation: explanation.trim() });
}
