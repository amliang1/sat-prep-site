/**
 * HTTP-level integration test for the new flows.  Assumes `next dev` is
 * already running on http://localhost:${PORT} (default 3000).
 *
 *   DATABASE_URL="file:./dev.db" node --import tsx scripts/test-http.ts
 *
 * Auth: signs in as the seeded student1@satforge.local (Student123!) and
 * stores the satprep_session cookie for subsequent requests.
 */

import { prisma } from "../src/lib/prisma";

const BASE = `http://localhost:${process.env.TEST_PORT || 3000}`;
const STUDENT_EMAIL = "student1@satforge.local";
const STUDENT_PASSWORD = "Student123!";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(name: string, cond: unknown, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}${detail ? `  — ${detail}` : ""}`);
  } else {
    failed += 1;
    failures.push(name + (detail ? `: ${detail}` : ""));
    console.log(`  ✗ ${name}${detail ? `  — ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log("\n" + title);
  console.log("─".repeat(title.length));
}

type Resp = {
  status: number;
  headers: Headers;
  body: string;
};

let cookie = "";

async function call(
  path: string,
  init: RequestInit & { form?: Record<string, string>; json?: unknown; redirect?: RequestRedirect } = {}
): Promise<Resp> {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);

  let body: BodyInit | undefined;
  if (init.form) {
    body = new URLSearchParams(init.form).toString();
    headers.set("content-type", "application/x-www-form-urlencoded");
  } else if (init.json !== undefined) {
    body = JSON.stringify(init.json);
    headers.set("content-type", "application/json");
  } else if (init.body) {
    body = init.body as BodyInit;
  }

  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? (body ? "POST" : "GET"),
    redirect: init.redirect ?? "manual",
    headers,
    body
  });

  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    const match = setCookie.match(/satprep_session=[^;]+/);
    if (match) cookie = match[0];
  }
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text };
}

async function waitForServer(maxMs = 30_000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/login`, { redirect: "manual" });
      if (res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not respond at ${BASE} within ${maxMs}ms`);
}

async function main() {
  section("Boot check");
  await waitForServer();
  ok("dev server reachable", true, BASE);

  section("Auth");
  {
    // Use the seeded student account.  Clear any prior CAT/SRS state so the
    // test is reproducible against the same fixture.
    const student = await prisma.user.findUnique({ where: { email: STUDENT_EMAIL } });
    if (!student) throw new Error("Seed missing — run npm run db:seed");

    await prisma.adaptiveAttempt.deleteMany({ where: { userId: student.id } });
    await prisma.socraticConversation.deleteMany({ where: { userId: student.id } });
    await prisma.skillMastery.deleteMany({ where: { userId: student.id } });
    await prisma.practiceAnswer.deleteMany({ where: { userId: student.id } });
    await prisma.practiceSession.deleteMany({ where: { userId: student.id } });
    await prisma.srsItem.deleteMany({ where: { userId: student.id } });

    const login = await call("/api/auth/login", {
      form: { email: STUDENT_EMAIL, password: STUDENT_PASSWORD }
    });
    ok("login responds with redirect", login.status >= 300 && login.status < 400, `status=${login.status}`);
    ok("login set session cookie", cookie.includes("satprep_session"));
  }

  /* ──────────────────────────────────────────────────────── Adaptive CAT */
  section("Adaptive CAT (HTTP)");
  let attemptId = "";
  {
    const start = await call("/api/cat/start", {
      form: { section: "MATH", maxQuestions: "8", seTarget: "0.4" }
    });
    ok("CAT start redirects", start.status >= 300 && start.status < 400, `status=${start.status}`);
    const loc = start.headers.get("location") ?? "";
    const match = loc.match(/\/cat\/([^/?#]+)/);
    if (match) attemptId = match[1];
    ok("CAT start returns /cat/[attemptId]", Boolean(attemptId), loc);

    const view = await call(`/cat/${attemptId}`);
    ok("GET /cat/[attemptId] renders 200", view.status === 200, `status=${view.status}`);
    ok("page contains projected score panel", view.body.includes("Projected score"));

    // Walk the attempt: for each of 8 turns, pull the chosen question id from
    // the rendered HTML's hidden questionId input, then post a deterministic
    // answer (always pick the correct choice for half of them, wrong for half).
    const student = await prisma.user.findUnique({ where: { email: STUDENT_EMAIL } });
    let answered = 0;
    for (let i = 0; i < 8; i += 1) {
      const page = await call(`/cat/${attemptId}`);
      if (page.body.includes("Adaptive diagnostic complete")) break;
      const qid = page.body.match(/name="questionId"[^>]*?value="([^"]+)"/)?.[1];
      if (!qid) {
        ok(`step ${i + 1}: found questionId in HTML`, false);
        break;
      }
      const q = await prisma.question.findUnique({
        where: { id: qid },
        select: { correctChoiceId: true, choices: { select: { id: true } } }
      });
      const chosen =
        i % 2 === 0
          ? q?.correctChoiceId ?? q?.choices[0]?.id ?? ""
          : q?.choices.find((c) => c.id !== q.correctChoiceId)?.id ?? "";
      const ans = await call(`/api/cat/${attemptId}/answer`, {
        form: { questionId: qid, choiceId: chosen, renderedAtMs: String(Date.now() - 1000) }
      });
      if (!(ans.status >= 300 && ans.status < 400)) {
        ok(`step ${i + 1}: answer accepted`, false, `status=${ans.status}`);
        break;
      }
      answered += 1;
    }
    ok("CAT walked multiple turns", answered >= 3, `${answered} answered`);

    const attempt = await prisma.adaptiveAttempt.findUnique({
      where: { id: attemptId },
      include: { responses: true }
    });
    ok("CAT persisted responses", (attempt?.responses.length ?? 0) === answered);
    ok(
      "theta updated away from prior",
      attempt && Math.abs(attempt.theta) > 0.01,
      `θ=${attempt?.theta.toFixed(2)} SE=${attempt?.thetaSe.toFixed(2)}`
    );
  }

  /* ───────────────────────────────────────────────── Practice session */
  section("Practice session (HTTP)");
  let sessionId = "";
  {
    const start = await call("/api/practice/start", {
      form: { section: "MATH", difficulty: "ALL", domain: "", count: "3" }
    });
    ok("practice start redirects", start.status >= 300 && start.status < 400);
    const loc = start.headers.get("location") ?? "";
    sessionId = loc.match(/\/practice\/([^/?#]+)/)?.[1] ?? "";
    ok("practice start returns /practice/[sessionId]", Boolean(sessionId), loc);

    const view = await call(`/practice/${sessionId}`);
    ok("GET /practice/[sessionId] renders 200", view.status === 200);
    ok("practice page contains tutor button", view.body.includes("Socratic tutor"));

    const qid = view.body.match(/name="questionId"[^>]*?value="([^"]+)"/)?.[1] ?? "";
    ok("practice page exposes questionId", Boolean(qid));
    const q = await prisma.question.findUnique({
      where: { id: qid },
      select: { correctChoiceId: true, choices: { select: { id: true } } }
    });
    const ans = await call(`/api/practice/${sessionId}/answer`, {
      form: {
        questionId: qid,
        choiceId: q?.correctChoiceId ?? "",
        renderedAtMs: String(Date.now() - 500)
      }
    });
    ok("practice answer redirects", ans.status >= 300 && ans.status < 400);

    const student = await prisma.user.findUnique({ where: { email: STUDENT_EMAIL } });
    const mastery = await prisma.skillMastery.findMany({ where: { userId: student!.id } });
    ok("answering updated BKT mastery", mastery.length > 0, `${mastery.length} rows`);
    ok(
      "BKT mastery within [0,1]",
      mastery.every((m) => m.mastery >= 0 && m.mastery <= 1)
    );
  }

  /* ───────────────────────────────────────────────── Socratic reveal */
  section("Socratic reveal");
  {
    const question = await prisma.question.findFirst({
      where: { correctChoiceId: { not: null } },
      include: { choices: true }
    });
    const reveal = await call(`/api/socratic/${question!.id}/reveal`, { method: "POST" });
    ok("reveal returns 200", reveal.status === 200);
    const parsed = JSON.parse(reveal.body);
    ok(
      "reveal has correctChoice or correctTextAnswer",
      parsed.correctChoice !== undefined || parsed.correctTextAnswer !== undefined
    );
  }

  /* ───────────────────────────────────────────────── Socratic message */
  section("Socratic message (Gemini)");
  {
    const question = await prisma.question.findFirst({
      where: { correctChoiceId: { not: null } }
    });
    const msg = await call(`/api/socratic/${question!.id}/message`, {
      json: { message: "I think this problem is about percentages but I'm not sure where to start." }
    });
    if (msg.status === 200) {
      const parsed = JSON.parse(msg.body);
      ok("Gemini returned a reply", typeof parsed.reply === "string" && parsed.reply.length > 0);
      const student = await prisma.user.findUnique({ where: { email: STUDENT_EMAIL } });
      const convos = await prisma.socraticConversation.findMany({
        where: { userId: student!.id, questionId: question!.id },
        include: { messages: true }
      });
      ok("Socratic conversation + messages persisted", convos[0]?.messages.length >= 2);
    } else {
      const parsed = JSON.parse(msg.body);
      ok(
        "Gemini unavailable returns 502 with error",
        msg.status === 502 && typeof parsed.error === "string",
        `status=${msg.status} — GEMINI_API_KEY not configured (expected in CI)`
      );
    }
  }

  /* ───────────────────────────────────────────────── Dashboard render */
  section("Dashboard render");
  {
    const dash = await call("/dashboard");
    ok("GET /dashboard renders 200", dash.status === 200, `status=${dash.status}`);
    ok("dashboard has score forecast", dash.body.includes("Calibrated score forecast"));
    ok("dashboard has mastery graph", dash.body.includes("Skill mastery graph"));
    // SVG renders only when a section is laid out — should contain at least one rect node
    ok("dashboard mastery SVG present", /<svg[\s\S]*?<rect/.test(dash.body));
  }

  /* ───────────────────────────────────────────────── Cat launcher page */
  section("CAT launcher page");
  {
    const newCat = await call("/cat/new");
    ok("GET /cat/new renders 200", newCat.status === 200);
    ok("cat/new has section selector", newCat.body.includes('name="section"'));
  }

  /* ───────────────────────────────────────────────── Practice hub */
  section("Practice hub page");
  {
    const p = await call("/practice");
    ok("GET /practice renders 200", p.status === 200);
    ok("practice hub has adaptive button", p.body.includes("Adaptive diagnostic"));
  }

  section("Summary");
  console.log(`  ${passed} passed · ${failed} failed`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
  }
  await prisma.$disconnect();
  if (failed > 0) process.exitCode = 1;
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
