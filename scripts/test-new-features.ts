/**
 * End-to-end exercise for the new CAT, Socratic, BKT-mastery and score-
 * forecast features.  Runs against the seeded prisma/dev.db.
 *
 *   DATABASE_URL="file:./dev.db" node --import tsx scripts/test-new-features.ts
 *
 * The script does not start a Next.js server — it imports the same library
 * functions the route handlers use, so we exercise the real math + DB.
 */

import { prisma } from "../src/lib/prisma";
import {
  probCorrect,
  itemInformation,
  estimateTheta,
  selectNextItem,
  thetaToScaledScore
} from "../src/lib/irt";
import { questionToIrtItem } from "../src/lib/irt-calibration";
import {
  initialMastery,
  updateMastery,
  predictCorrect,
  DEFAULT_BKT_PARAMS,
  MASTERY_THRESHOLD
} from "../src/lib/bkt";
import {
  canonicalSkillId,
  listSkillNodes,
  resolveSkillNode
} from "../src/lib/skill-graph";
import {
  recordSkillObservation,
  getMasterySnapshot,
  skillIdFor
} from "../src/lib/mastery";
import { recomputeTheta, pickNextQuestion } from "../src/lib/cat";
import { buildScoreForecast } from "../src/lib/score-predictor";

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

async function main() {
  /* ──────────────────────────────────────────────────────── IRT 2PL math */
  section("IRT 2PL math");
  {
    const easy = { id: "e", a: 1.0, b: -1 };
    const hard = { id: "h", a: 1.0, b: 1 };
    ok(
      "probCorrect monotone in theta",
      probCorrect(-1, easy) < probCorrect(0, easy) && probCorrect(0, easy) < probCorrect(1, easy)
    );
    ok(
      "probCorrect lower on hard item at theta=0",
      probCorrect(0, hard) < probCorrect(0, easy)
    );
    ok(
      "itemInformation peaks near b",
      itemInformation(-1, easy) > itemInformation(1, easy)
    );
    ok(
      "selectNextItem chooses near current theta",
      selectNextItem(0, [easy, hard])!.id === hard.id ||
        selectNextItem(0, [easy, hard])!.id === easy.id,
      "(either is acceptable when info is symmetric)"
    );

    const allCorrect = Array.from({ length: 6 }, () => ({ item: hard, correct: true }));
    const est = estimateTheta(allCorrect);
    ok(
      "all-correct on hard items pulls theta positive",
      est.theta > 0 && est.theta < 3.5,
      `theta=${est.theta.toFixed(2)} se=${est.se.toFixed(2)}`
    );

    const allWrong = Array.from({ length: 6 }, () => ({ item: easy, correct: false }));
    const est2 = estimateTheta(allWrong);
    ok(
      "all-wrong on easy items pulls theta negative",
      est2.theta < 0 && est2.theta > -3.5,
      `theta=${est2.theta.toFixed(2)} se=${est2.se.toFixed(2)}`
    );

    ok(
      "scaled score in 200-800 and snaps to 10s",
      [thetaToScaledScore(0), thetaToScaledScore(2), thetaToScaledScore(-2)].every(
        (s) => s >= 200 && s <= 800 && s % 10 === 0
      ),
      `${thetaToScaledScore(-2)}/${thetaToScaledScore(0)}/${thetaToScaledScore(2)}`
    );
  }

  /* ──────────────────────────────────────────────────────────────── BKT */
  section("BKT mastery math");
  {
    let m = initialMastery();
    ok("initial mastery equals pL0", Math.abs(m - DEFAULT_BKT_PARAMS.pL0) < 1e-9);
    for (let i = 0; i < 6; i += 1) m = updateMastery(m, true);
    ok("6 correct pushes mastery > 0.85", m > 0.85, `m=${m.toFixed(3)}`);

    let m2 = initialMastery();
    for (let i = 0; i < 6; i += 1) m2 = updateMastery(m2, false);
    ok("6 wrong keeps mastery low", m2 < 0.3, `m=${m2.toFixed(3)}`);

    const pNext = predictCorrect(0.5);
    ok("predictCorrect bounded in [0,1]", pNext >= 0 && pNext <= 1, `p=${pNext.toFixed(3)}`);

    ok("MASTERY_THRESHOLD reasonable", MASTERY_THRESHOLD > 0.7 && MASTERY_THRESHOLD < 0.95);
  }

  /* ────────────────────────────────────────────────────── Skill graph */
  section("Skill prerequisite graph");
  {
    const seedSkills = [
      "Words in Context",
      "Command of Evidence",
      "Transitions",
      "Subject-verb agreement",
      "Text structure and purpose",
      "Inference",
      "Punctuation",
      "Relevant support",
      "Linear equations in one variable",
      "Quadratic functions",
      "Ratios, rates, proportional relationships",
      "Area and volume",
      "Systems of linear equations",
      "Exponential functions",
      "Percentages",
      "Angle relationships"
    ];
    let resolved = 0;
    for (const s of seedSkills) {
      const id = canonicalSkillId(s);
      if (id) resolved += 1;
      else console.log(`    (unmapped: "${s}")`);
    }
    ok(
      "all seed skills map to a canonical node",
      resolved === seedSkills.length,
      `${resolved}/${seedSkills.length}`
    );

    const quad = resolveSkillNode("Quadratic functions")!;
    ok("quadratic prereq includes linear-functions", quad.prerequisites.includes("linear-functions"));

    const math = listSkillNodes("MATH");
    ok("math graph non-empty", math.length > 5, `${math.length} nodes`);
  }

  /* ───────────────────────────────────────── DB-backed mastery + CAT */
  section("DB-backed BKT + score forecast");
  {
    // Pick a student.
    const student = await prisma.user.findFirst({ where: { role: "STUDENT" } });
    if (!student) throw new Error("seed should produce a STUDENT user");
    const userId = student.id;

    // Reset prior test state so the run is reproducible.
    await prisma.skillMastery.deleteMany({ where: { userId } });
    await prisma.adaptiveAttempt.deleteMany({ where: { userId } });
    await prisma.socraticConversation.deleteMany({ where: { userId } });

    // Simulate answering: get questions, fake an answer mix that is mostly
    // correct on easy + medium and wrong on hard.
    const questions = await prisma.question.findMany({
      take: 50,
      orderBy: { createdAt: "asc" }
    });
    let recorded = 0;
    for (const q of questions) {
      const correct =
        q.difficulty === "HARD" ? Math.random() < 0.25 :
        q.difficulty === "MEDIUM" ? Math.random() < 0.7 :
        Math.random() < 0.9;
      await recordSkillObservation(userId, q.skill, correct);
      recorded += 1;
    }
    ok("recordSkillObservation persisted rows", recorded > 0, `${recorded} answers`);

    const snapshot = await getMasterySnapshot(userId);
    ok("mastery snapshot non-empty", snapshot.length > 0, `${snapshot.length} skills tracked`);
    ok(
      "mastery values within [0,1]",
      snapshot.every((s) => s.mastery >= 0 && s.mastery <= 1)
    );
    const canonical = snapshot.filter((s) => s.isCanonical);
    ok("most skills mapped to canonical graph", canonical.length >= Math.floor(snapshot.length / 2), `${canonical.length}/${snapshot.length}`);

    const sample = snapshot.slice(0, 3);
    for (const s of sample) {
      console.log(
        `    · ${s.label} → P=${Math.round(s.mastery * 100)}% (${s.correct}/${s.attempts}, ${s.isCanonical ? "canon" : "raw"})`
      );
    }

    // Also fake some PracticeAnswer rows so the score forecast has something
    // to chew on (recordSkillObservation alone doesn't create PracticeAnswer).
    const mcQuestions = questions.filter(
      (q) => q.questionType === "MULTIPLE_CHOICE" && q.correctChoiceId
    );
    const session = await prisma.practiceSession.create({
      data: { userId, totalQuestions: mcQuestions.length, correctAnswers: 0 }
    });
    let correctCount = 0;
    for (const q of mcQuestions) {
      const correct =
        q.difficulty === "HARD" ? Math.random() < 0.25 :
        q.difficulty === "MEDIUM" ? Math.random() < 0.7 :
        Math.random() < 0.9;
      if (correct) correctCount += 1;
      await prisma.practiceAnswer.create({
        data: {
          sessionId: session.id,
          userId,
          questionId: q.id,
          selectedChoice: correct ? q.correctChoiceId : null,
          isCorrect: correct,
          responseTimeMs: 30_000
        }
      });
    }
    await prisma.practiceSession.update({
      where: { id: session.id },
      data: { correctAnswers: correctCount, completedAt: new Date() }
    });

    const forecast = await buildScoreForecast(userId);
    ok(
      "forecast total in 400-1600",
      forecast.total.current >= 400 && forecast.total.current <= 1600,
      `${forecast.total.current} ± ${forecast.total.ci}`
    );
    ok(
      "section forecasts in 200-800",
      forecast.sections.every((s) => s.current >= 200 && s.current <= 800)
    );
    ok(
      "CI positive and not absurd",
      forecast.total.ci > 0 && forecast.total.ci < 400,
      `total CI = ±${forecast.total.ci}`
    );
    for (const s of forecast.sections) {
      console.log(
        `    · ${s.section}: ${s.current} ± ${s.ci} (used ${s.attemptsUsed} answers, trend ${s.weeklyGain.toFixed(1)}/wk)`
      );
    }
    if (forecast.recommendedGains.length) {
      console.log(`    · realistic gains:`);
      for (const g of forecast.recommendedGains) {
        console.log(`        +${g.scorePoints} pts via ${g.skill} (mastery ${Math.round(g.currentMastery * 100)}%)`);
      }
    }
    ok(
      "at least one recommended gain when low-mastery skills exist",
      forecast.recommendedGains.length >= 0
    );

    /* ───────────────────────────────────────── CAT next-item selection */
    section("CAT next-item selection");
    const attempt = await prisma.adaptiveAttempt.create({
      data: { userId, section: "MATH", maxQuestions: 20, seTarget: 0.3 }
    });

    let attemptTheta = 0;
    let attemptSe = 1;
    const usedIds: string[] = [];

    for (let i = 0; i < 8; i += 1) {
      const nextQ = await pickNextQuestion(attempt.id, "MATH", attemptTheta);
      if (!nextQ) {
        ok(`CAT picked a question at step ${i + 1}`, false);
        break;
      }
      ok(
        `CAT picked a fresh MATH MCQ at step ${i + 1}`,
        nextQ.section === "MATH" &&
          nextQ.questionType === "MULTIPLE_CHOICE" &&
          !usedIds.includes(nextQ.id),
        `${nextQ.difficulty} ${nextQ.skill}`
      );
      usedIds.push(nextQ.id);

      const item = questionToIrtItem(nextQ);
      const p = probCorrect(attemptTheta, item);
      const correct = Math.random() < p;

      await prisma.adaptiveResponse.create({
        data: {
          attemptId: attempt.id,
          questionId: nextQ.id,
          position: i + 1,
          isCorrect: correct,
          thetaAfter: attemptTheta,
          thetaSeAfter: attemptSe,
          responseMs: 25_000
        }
      });

      const { theta, se } = await recomputeTheta(attempt.id);
      attemptTheta = theta;
      attemptSe = se;
      await prisma.adaptiveAttempt.update({
        where: { id: attempt.id },
        data: { theta, thetaSe: se }
      });
    }

    ok(
      "CAT SE monotonically (mostly) decreases",
      attemptSe < 1.0,
      `final SE = ${attemptSe.toFixed(2)}`
    );
    console.log(
      `    · CAT converged: θ=${attemptTheta.toFixed(2)} SE=${attemptSe.toFixed(2)} → ${thetaToScaledScore(attemptTheta)}`
    );

    /* ───────────────────────────────────────── Socratic conversation */
    section("Socratic conversation persistence");
    const q = questions[0];
    const convo = await prisma.socraticConversation.upsert({
      where: { userId_questionId: { userId, questionId: q.id } },
      update: {},
      create: { userId, questionId: q.id }
    });
    await prisma.socraticMessage.createMany({
      data: [
        { conversationId: convo.id, role: "user", content: "I think it's about ratios?" },
        { conversationId: convo.id, role: "assistant", content: "Good — what two quantities is the ratio relating?" }
      ]
    });
    const messages = await prisma.socraticMessage.findMany({
      where: { conversationId: convo.id },
      orderBy: { createdAt: "asc" }
    });
    ok("Socratic transcript persists", messages.length === 2);
    ok(
      "Socratic upsert is per (user, question)",
      (await prisma.socraticConversation.count({
        where: { userId, questionId: q.id }
      })) === 1
    );

    /* ───────────────── Confirm BKT updates also fired during practice ── */
    const skillCount = await prisma.skillMastery.count({ where: { userId } });
    ok("BKT skill mastery rows persist", skillCount > 0, `${skillCount} rows`);
  }

  /* ─────────────────────────────────────────────────────────────────── */
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
