import { prisma } from "@/lib/prisma";

type StudentSnapshot = {
  id: string;
  name: string;
  email: string;
  accuracy: number;
  avgResponseSeconds: number;
  sessionsCompleted: number;
};

function percentage(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function linearForecast(points: number[]) {
  if (points.length < 2) {
    return points.at(-1) ?? 0;
  }

  const xs = points.map((_, index) => index + 1);
  const xMean = average(xs);
  const yMean = average(points);
  const numerator = xs.reduce((sum, x, index) => sum + (x - xMean) * (points[index] - yMean), 0);
  const denominator = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0);
  const slope = denominator ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  return Math.max(0, Math.min(100, Math.round(intercept + slope * (points.length + 1))));
}

export async function getDashboardAnalytics(userId: string, role: string) {
  const [sessions, answers, classrooms] = await Promise.all([
    prisma.practiceSession.findMany({
      where: { userId },
      orderBy: { startedAt: "asc" }
    }),
    prisma.practiceAnswer.findMany({
      where: { userId },
      orderBy: { answeredAt: "asc" },
      include: {
        question: {
          select: {
            id: true,
            domain: true,
            skill: true,
            difficulty: true,
            section: true
          }
        }
      }
    }),
    role === "ADMIN"
      ? prisma.classroom.findMany({
          where: { tutorId: userId },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    answers: {
                      include: {
                        question: {
                          select: {
                            skill: true
                          }
                        }
                      }
                    },
                    sessions: true
                  }
                }
              }
            }
          }
        })
      : Promise.resolve([])
  ]);

  const totalCorrect = answers.filter((answer) => answer.isCorrect).length;
  const overallAccuracy = percentage(totalCorrect, answers.length);
  const responseTimes = answers.map((answer) => answer.responseTimeMs ?? 0).filter(Boolean);
  const avgResponseSeconds = Math.round(average(responseTimes) / 1000);

  const skillStats = answers.reduce<Record<string, { correct: number; total: number }>>((acc, answer) => {
    const key = answer.question.skill;
    const current = acc[key] ?? { correct: 0, total: 0 };
    current.total += 1;
    if (answer.isCorrect) {
      current.correct += 1;
    }
    acc[key] = current;
    return acc;
  }, {});

  const skillMastery = Object.entries(skillStats)
    .map(([skill, stat]) => ({
      skill,
      accuracy: percentage(stat.correct, stat.total),
      attempts: stat.total
    }))
    .sort((a, b) => b.attempts - a.attempts || b.accuracy - a.accuracy);

  const weakAreas = skillMastery
    .filter((item) => item.attempts >= 1)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, 4);

  const difficultyStats = answers.reduce<Record<string, { correct: number; total: number }>>((acc, answer) => {
    const key = answer.question.difficulty;
    const current = acc[key] ?? { correct: 0, total: 0 };
    current.total += 1;
    if (answer.isCorrect) {
      current.correct += 1;
    }
    acc[key] = current;
    return acc;
  }, {});

  const accuracyByDifficulty = ["EASY", "MEDIUM", "HARD"].map((difficulty) => {
    const stat = difficultyStats[difficulty] ?? { correct: 0, total: 0 };
    return {
      difficulty,
      accuracy: percentage(stat.correct, stat.total),
      attempts: stat.total
    };
  });

  const attemptsByQuestion = answers.reduce<Record<string, typeof answers>>((acc, answer) => {
    const current = acc[answer.questionId] ?? [];
    current.push(answer);
    acc[answer.questionId] = current;
    return acc;
  }, {});

  let firstTryCorrect = 0;
  let firstTryTotal = 0;
  let repeatCorrect = 0;
  let repeatTotal = 0;

  Object.values(attemptsByQuestion).forEach((attempts) => {
    const sorted = [...attempts].sort((a, b) => a.answeredAt.getTime() - b.answeredAt.getTime());
    const [first, ...rest] = sorted;
    if (first) {
      firstTryTotal += 1;
      if (first.isCorrect) {
        firstTryCorrect += 1;
      }
    }
    rest.forEach((attempt) => {
      repeatTotal += 1;
      if (attempt.isCorrect) {
        repeatCorrect += 1;
      }
    });
  });

  const sessionScores = sessions
    .filter((session) => session.totalQuestions > 0)
    .map((session) => percentage(session.correctAnswers, session.totalQuestions));
  const recentTrend = sessionScores.slice(-6);
  const forecastScore = linearForecast(recentTrend);

  const timeBySkill = skillMastery
    .map((item) => {
      const skillAnswers = answers.filter((answer) => answer.question.skill === item.skill && answer.responseTimeMs);
      return {
        skill: item.skill,
        avgResponseSeconds: Math.round(average(skillAnswers.map((answer) => answer.responseTimeMs ?? 0)) / 1000)
      };
    })
    .filter((item) => item.avgResponseSeconds > 0)
    .sort((a, b) => b.avgResponseSeconds - a.avgResponseSeconds)
    .slice(0, 5);

  const cohortAnalytics = classrooms.map((classroom) => {
    const students = classroom.members
      .filter((member) => member.role === "STUDENT")
      .map((member) => {
        const studentAnswers = member.user.answers;
        const studentCorrect = studentAnswers.filter((answer) => answer.isCorrect).length;
        const times = studentAnswers.map((answer) => answer.responseTimeMs ?? 0).filter(Boolean);
        return {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          accuracy: percentage(studentCorrect, studentAnswers.length),
          avgResponseSeconds: Math.round(average(times) / 1000),
          sessionsCompleted: member.user.sessions.filter((session) => Boolean(session.completedAt)).length
        } satisfies StudentSnapshot;
      });

    const skillRollup = classroom.members
      .flatMap((member) => member.user.answers)
      .reduce<Record<string, { correct: number; total: number }>>((acc, answer) => {
        const skill = answer.question.skill;
        const current = acc[skill] ?? { correct: 0, total: 0 };
        current.total += 1;
        if (answer.isCorrect) {
          current.correct += 1;
        }
        acc[skill] = current;
        return acc;
      }, {});

    const weakSkills = Object.entries(skillRollup)
      .map(([skill, stat]) => ({
        skill,
        accuracy: percentage(stat.correct, stat.total),
        attempts: stat.total
      }))
      .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
      .slice(0, 3);

    return {
      id: classroom.id,
      name: classroom.name,
      studentCount: students.length,
      avgAccuracy: Math.round(average(students.map((student) => student.accuracy))),
      avgResponseSeconds: Math.round(average(students.map((student) => student.avgResponseSeconds).filter(Boolean))),
      weakSkills,
      students
    };
  });

  return {
    overallAccuracy,
    avgResponseSeconds,
    sessionsCompleted: sessions.filter((session) => Boolean(session.completedAt)).length,
    totalAttempts: answers.length,
    skillMastery,
    weakAreas,
    accuracyByDifficulty,
    firstTryAccuracy: percentage(firstTryCorrect, firstTryTotal),
    repeatAccuracy: percentage(repeatCorrect, repeatTotal),
    repeatAttempts: repeatTotal,
    recentTrend,
    forecastScore,
    timeBySkill,
    cohortAnalytics
  };
}
