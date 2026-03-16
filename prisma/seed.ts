import bcrypt from "bcryptjs";
import { DIFFICULTIES, SECTIONS, USER_ROLES } from "../src/lib/constants";
import { prisma } from "../src/lib/prisma";

const sampleQuestions = [
  {
    externalId: "seed-rw-1",
    source: "Seed Data",
    sourceUrl: "https://satsuitequestionbank.collegeboard.org/",
    testName: "Starter Reading & Writing Set",
    section: "READING_WRITING" as (typeof SECTIONS)[number],
    domain: "Craft and Structure",
    skill: "Words in Context",
    difficulty: "MEDIUM" as (typeof DIFFICULTIES)[number],
    prompt:
      "The scientist’s tone in the passage is best described as one of cautious optimism because she acknowledges the method’s limits while emphasizing its promise.",
    passage:
      "Researchers testing a drought-resistant wheat strain noted that early field results varied by region. Still, in areas with the most severe water shortages, the crop produced meaningfully higher yields than standard varieties.",
    explanation:
      "The passage balances a limitation, variable field results, with a positive outcome, higher yields in severe drought regions.",
    answerLabel: "B",
    choices: [
      { label: "A", text: "skeptical dismissal" },
      { label: "B", text: "cautious optimism" },
      { label: "C", text: "comic exaggeration" },
      { label: "D", text: "detached indifference" }
    ],
    tags: ["reading", "released-style", "vocabulary"]
  },
  {
    externalId: "seed-rw-2",
    source: "Seed Data",
    sourceUrl: "https://satsuitequestionbank.collegeboard.org/",
    testName: "Starter Reading & Writing Set",
    section: "READING_WRITING" as (typeof SECTIONS)[number],
    domain: "Information and Ideas",
    skill: "Command of Evidence",
    difficulty: "EASY" as (typeof DIFFICULTIES)[number],
    prompt: "Which choice best states the main purpose of the passage?",
    passage:
      "A city report found that adding protected bike lanes reduced travel times for cyclists and lowered the rate of traffic injuries along the redesigned streets. Officials now plan to expand the program to three additional neighborhoods.",
    explanation: "The passage presents findings from a city report and notes the resulting expansion plan.",
    answerLabel: "C",
    choices: [
      { label: "A", text: "To criticize cyclists for ignoring traffic rules" },
      { label: "B", text: "To compare public transit systems across cities" },
      { label: "C", text: "To report the effects of protected bike lanes" },
      { label: "D", text: "To describe how roads are constructed" }
    ],
    tags: ["reading", "command-of-evidence"]
  },
  {
    externalId: "seed-rw-3",
    source: "Seed Data",
    sourceUrl: "https://satsuitequestionbank.collegeboard.org/",
    testName: "Starter Reading & Writing Set",
    section: "READING_WRITING" as (typeof SECTIONS)[number],
    domain: "Expression of Ideas",
    skill: "Transitions",
    difficulty: "MEDIUM" as (typeof DIFFICULTIES)[number],
    prompt: "Which choice completes the text with the most logical transition?",
    passage:
      "The museum expanded its evening hours last summer, and attendance rose by 18 percent. ______, the museum plans to keep the longer schedule throughout the coming year.",
    explanation: "The second sentence follows as a result of the attendance increase, so a cause-and-effect transition is needed.",
    answerLabel: "A",
    choices: [
      { label: "A", text: "As a result," },
      { label: "B", text: "For example," },
      { label: "C", text: "Meanwhile," },
      { label: "D", text: "Instead," }
    ],
    tags: ["reading", "transitions", "expression-of-ideas"]
  },
  {
    externalId: "seed-rw-4",
    source: "Seed Data",
    sourceUrl: "https://satsuitequestionbank.collegeboard.org/",
    testName: "Starter Reading & Writing Set",
    section: "READING_WRITING" as (typeof SECTIONS)[number],
    domain: "Standard English Conventions",
    skill: "Subject-verb agreement",
    difficulty: "EASY" as (typeof DIFFICULTIES)[number],
    prompt: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    passage:
      "A collection of letters written by the poet during her travels ______ on display in the university library this month.",
    explanation: "The subject is collection, which is singular, so the singular verb is required.",
    answerLabel: "B",
    choices: [
      { label: "A", text: "are" },
      { label: "B", text: "is" },
      { label: "C", text: "have been" },
      { label: "D", text: "were" }
    ],
    tags: ["reading", "grammar", "subject-verb-agreement"]
  },
  {
    externalId: "seed-rw-5",
    source: "Seed Data",
    sourceUrl: "https://satsuitequestionbank.collegeboard.org/",
    testName: "Starter Reading & Writing Set",
    section: "READING_WRITING" as (typeof SECTIONS)[number],
    domain: "Craft and Structure",
    skill: "Text structure and purpose",
    difficulty: "HARD" as (typeof DIFFICULTIES)[number],
    prompt: "Which choice best describes the function of the underlined sentence in the text as a whole?",
    passage:
      "Marine biologists once assumed that reef fish larvae drifted passively until they settled near shore. Recent tracking studies suggest otherwise. Underlined sentence: \"Some larvae appear to detect chemical cues in the water and swim toward suitable habitats.\" The studies have changed how researchers think about early fish development.",
    explanation: "The underlined sentence presents the key evidence that challenges the earlier assumption described in the first sentence.",
    answerLabel: "C",
    choices: [
      { label: "A", text: "It introduces a topic that the rest of the text rejects as irrelevant." },
      { label: "B", text: "It provides a historical example that explains why the assumption became popular." },
      { label: "C", text: "It offers evidence that revises the assumption mentioned earlier in the text." },
      { label: "D", text: "It summarizes a debate that remains unresolved by the end of the text." }
    ],
    tags: ["reading", "text-structure", "craft-and-structure"]
  },
  {
    externalId: "seed-rw-6",
    source: "Seed Data",
    sourceUrl: "https://satsuitequestionbank.collegeboard.org/",
    testName: "Starter Reading & Writing Set",
    section: "READING_WRITING" as (typeof SECTIONS)[number],
    domain: "Information and Ideas",
    skill: "Inference",
    difficulty: "MEDIUM" as (typeof DIFFICULTIES)[number],
    prompt: "Which choice most logically completes the text?",
    passage:
      "A recent study of neighborhood trees found that blocks with greater canopy cover were several degrees cooler on summer afternoons than nearby blocks with fewer trees. The study’s findings suggest that city planners hoping to reduce urban heat should ______.",
    explanation: "If more tree cover is associated with lower temperatures, then increasing tree planting is the logical conclusion.",
    answerLabel: "D",
    choices: [
      { label: "A", text: "replace all paved sidewalks with gravel paths" },
      { label: "B", text: "limit public parks to densely populated districts" },
      { label: "C", text: "reduce the amount of shade around public buildings" },
      { label: "D", text: "expand tree-planting efforts in areas with little canopy cover" }
    ],
    tags: ["reading", "inference", "information-and-ideas"]
  },
  {
    externalId: "seed-rw-7",
    source: "Seed Data",
    sourceUrl: "https://satsuitequestionbank.collegeboard.org/",
    testName: "Starter Reading & Writing Set",
    section: "READING_WRITING" as (typeof SECTIONS)[number],
    domain: "Standard English Conventions",
    skill: "Punctuation",
    difficulty: "MEDIUM" as (typeof DIFFICULTIES)[number],
    prompt: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    passage:
      "The committee reviewed several proposals for the new community center including a rooftop garden, a recording studio, and a child-care room ______ it selected the plan that fit the budget.",
    explanation: "Two independent clauses are joined, so a semicolon is the cleanest correct punctuation.",
    answerLabel: "C",
    choices: [
      { label: "A", text: "and" },
      { label: "B", text: "," },
      { label: "C", text: ";" },
      { label: "D", text: ":" }
    ],
    tags: ["reading", "grammar", "punctuation"]
  },
  {
    externalId: "seed-rw-8",
    source: "Seed Data",
    sourceUrl: "https://satsuitequestionbank.collegeboard.org/",
    testName: "Starter Reading & Writing Set",
    section: "READING_WRITING" as (typeof SECTIONS)[number],
    domain: "Expression of Ideas",
    skill: "Relevant support",
    difficulty: "HARD" as (typeof DIFFICULTIES)[number],
    prompt: "Which choice most effectively uses data from the table to complete the sentence?",
    passage:
      "A survey of 500 students found that 62 percent preferred digital flashcards, 24 percent preferred handwritten notes, and 14 percent had no preference. The results indicate that ______.",
    explanation: "The best completion accurately reflects that the largest share of surveyed students preferred digital flashcards.",
    answerLabel: "B",
    choices: [
      { label: "A", text: "students were evenly divided among the three study methods" },
      { label: "B", text: "digital flashcards were the most popular study method among surveyed students" },
      { label: "C", text: "handwritten notes were nearly as popular as digital flashcards" },
      { label: "D", text: "most surveyed students disliked both flashcards and handwritten notes" }
    ],
    tags: ["reading", "data", "expression-of-ideas"]
  },
  {
    externalId: "seed-math-1",
    source: "Seed Data",
    sourceUrl: "https://satsuitequestionbank.collegeboard.org/",
    testName: "Starter Math Set",
    section: "MATH" as (typeof SECTIONS)[number],
    domain: "Algebra",
    skill: "Linear equations in one variable",
    difficulty: "MEDIUM" as (typeof DIFFICULTIES)[number],
    prompt: "If 3x - 7 = 20, what is the value of x?",
    explanation: "Add 7 to both sides to get 3x = 27, then divide by 3.",
    answerLabel: "D",
    choices: [
      { label: "A", text: "7" },
      { label: "B", text: "8" },
      { label: "C", text: "6" },
      { label: "D", text: "9" }
    ],
    tags: ["math", "algebra", "linear-equations"]
  },
  {
    externalId: "seed-math-2",
    source: "Seed Data",
    sourceUrl: "https://satsuitequestionbank.collegeboard.org/",
    testName: "Starter Math Set",
    section: "MATH" as (typeof SECTIONS)[number],
    domain: "Advanced Math",
    skill: "Quadratic functions",
    difficulty: "HARD" as (typeof DIFFICULTIES)[number],
    prompt: "What are the solutions to x^2 - 5x + 6 = 0?",
    explanation: "Factor the expression as (x - 2)(x - 3) = 0.",
    answerLabel: "A",
    choices: [
      { label: "A", text: "2 and 3" },
      { label: "B", text: "-2 and -3" },
      { label: "C", text: "1 and 6" },
      { label: "D", text: "No real solutions" }
    ],
    tags: ["math", "quadratics", "advanced-math"]
  },
  {
    externalId: "seed-math-3",
    source: "Seed Data",
    sourceUrl: "https://satsuitequestionbank.collegeboard.org/",
    testName: "Starter Math Set",
    section: "MATH" as (typeof SECTIONS)[number],
    domain: "Problem-Solving and Data Analysis",
    skill: "Ratios, rates, proportional relationships",
    difficulty: "EASY" as (typeof DIFFICULTIES)[number],
    prompt: "A printer uses 3 cartridges for every 8,000 pages printed. At the same rate, how many cartridges are needed for 24,000 pages?",
    explanation: "Since 24,000 is 3 times 8,000, multiply 3 cartridges by 3.",
    answerLabel: "B",
    choices: [
      { label: "A", text: "6" },
      { label: "B", text: "9" },
      { label: "C", text: "8" },
      { label: "D", text: "12" }
    ],
    tags: ["math", "ratios", "data-analysis"]
  },
  {
    externalId: "seed-math-4",
    source: "Seed Data",
    sourceUrl: "https://satsuitequestionbank.collegeboard.org/",
    testName: "Starter Math Set",
    section: "MATH" as (typeof SECTIONS)[number],
    domain: "Geometry and Trigonometry",
    skill: "Area and volume",
    difficulty: "MEDIUM" as (typeof DIFFICULTIES)[number],
    prompt: "A rectangle has length 12 and width 5. What is the area of the rectangle?",
    explanation: "Area of a rectangle equals length times width: 12 × 5 = 60.",
    answerLabel: "C",
    choices: [
      { label: "A", text: "17" },
      { label: "B", text: "34" },
      { label: "C", text: "60" },
      { label: "D", text: "120" }
    ],
    tags: ["math", "geometry", "area"]
  },
  {
    externalId: "seed-math-5",
    source: "Seed Data",
    sourceUrl: "https://satsuitequestionbank.collegeboard.org/",
    testName: "Starter Math Set",
    section: "MATH" as (typeof SECTIONS)[number],
    domain: "Algebra",
    skill: "Systems of linear equations",
    difficulty: "HARD" as (typeof DIFFICULTIES)[number],
    prompt: "If y = 2x + 1 and y = x + 4, what is the value of x?",
    explanation: "Set the expressions equal: 2x + 1 = x + 4, so x = 3.",
    answerLabel: "A",
    choices: [
      { label: "A", text: "3" },
      { label: "B", text: "4" },
      { label: "C", text: "2" },
      { label: "D", text: "5" }
    ],
    tags: ["math", "algebra", "systems"]
  },
  {
    externalId: "seed-math-6",
    source: "Seed Data",
    sourceUrl: "https://satsuitequestionbank.collegeboard.org/",
    testName: "Starter Math Set",
    section: "MATH" as (typeof SECTIONS)[number],
    domain: "Advanced Math",
    skill: "Exponential functions",
    difficulty: "MEDIUM" as (typeof DIFFICULTIES)[number],
    prompt: "A bacteria culture doubles every hour. If it starts with 50 bacteria, how many bacteria will there be after 3 hours?",
    explanation: "Doubling 3 times means multiply by 2^3 = 8, so 50 × 8 = 400.",
    answerLabel: "D",
    choices: [
      { label: "A", text: "150" },
      { label: "B", text: "200" },
      { label: "C", text: "350" },
      { label: "D", text: "400" }
    ],
    tags: ["math", "advanced-math", "exponentials"]
  },
  {
    externalId: "seed-math-7",
    source: "Seed Data",
    sourceUrl: "https://satsuitequestionbank.collegeboard.org/",
    testName: "Starter Math Set",
    section: "MATH" as (typeof SECTIONS)[number],
    domain: "Problem-Solving and Data Analysis",
    skill: "Percentages",
    difficulty: "MEDIUM" as (typeof DIFFICULTIES)[number],
    prompt: "A jacket originally priced at $80 is on sale for 25% off. What is the sale price?",
    explanation: "Twenty-five percent of 80 is 20, and 80 - 20 = 60.",
    answerLabel: "B",
    choices: [
      { label: "A", text: "$55" },
      { label: "B", text: "$60" },
      { label: "C", text: "$65" },
      { label: "D", text: "$70" }
    ],
    tags: ["math", "percentages", "data-analysis"]
  },
  {
    externalId: "seed-math-8",
    source: "Seed Data",
    sourceUrl: "https://satsuitequestionbank.collegeboard.org/",
    testName: "Starter Math Set",
    section: "MATH" as (typeof SECTIONS)[number],
    domain: "Geometry and Trigonometry",
    skill: "Angle relationships",
    difficulty: "HARD" as (typeof DIFFICULTIES)[number],
    prompt: "Two angles are supplementary. If one angle measures 3x degrees and the other measures x + 20 degrees, what is the value of x?",
    explanation: "Supplementary angles sum to 180, so 3x + (x + 20) = 180, which gives 4x = 160 and x = 40.",
    answerLabel: "C",
    choices: [
      { label: "A", text: "30" },
      { label: "B", text: "35" },
      { label: "C", text: "40" },
      { label: "D", text: "45" }
    ],
    tags: ["math", "geometry", "angles"]
  }
];

async function main() {
  const adminPassword = await bcrypt.hash("ChangeMe123!", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@satforge.local" },
    update: {},
    create: {
      email: "admin@satforge.local",
      name: "Admin",
      passwordHash: adminPassword,
      role: USER_ROLES[1]
    }
  });

  const studentPassword = await bcrypt.hash("Student123!", 10);
  const [studentA, studentB] = await Promise.all([
    prisma.user.upsert({
      where: { email: "student1@satforge.local" },
      update: {},
      create: {
        email: "student1@satforge.local",
        name: "Avery Chen",
        passwordHash: studentPassword,
        role: USER_ROLES[0]
      }
    }),
    prisma.user.upsert({
      where: { email: "student2@satforge.local" },
      update: {},
      create: {
        email: "student2@satforge.local",
        name: "Jordan Patel",
        passwordHash: studentPassword,
        role: USER_ROLES[0]
      }
    })
  ]);

  for (const item of sampleQuestions) {
    const existing = await prisma.question.findUnique({
      where: { externalId: item.externalId }
    });

    const question = existing
      ? await prisma.question.update({
          where: { id: existing.id },
          data: {
            source: item.source,
            sourceUrl: item.sourceUrl,
            testName: item.testName,
            section: item.section,
            domain: item.domain,
            skill: item.skill,
            difficulty: item.difficulty,
            prompt: item.prompt,
            passage: item.passage,
            explanation: item.explanation
          }
        })
      : await prisma.question.create({
          data: {
            externalId: item.externalId,
            source: item.source,
            sourceUrl: item.sourceUrl,
            testName: item.testName,
            section: item.section,
            domain: item.domain,
            skill: item.skill,
            difficulty: item.difficulty,
            prompt: item.prompt,
            passage: item.passage,
            explanation: item.explanation
          }
        });

    await prisma.questionChoice.deleteMany({ where: { questionId: question.id } });
    const choices = await Promise.all(
      item.choices.map((choice, index) =>
        prisma.questionChoice.create({
          data: {
            questionId: question.id,
            label: choice.label,
            text: choice.text,
            sortOrder: index
          }
        })
      )
    );

    const tags = await Promise.all(
      item.tags.map((name) =>
        prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name }
        })
      )
    );

    await prisma.question.update({
      where: { id: question.id },
      data: {
        correctChoiceId: choices.find((choice) => choice.label === item.answerLabel)?.id,
        tags: {
          deleteMany: {},
          create: tags.map((tag) => ({ tagId: tag.id }))
        }
      }
    });
  }

  const classroom = await prisma.classroom.upsert({
    where: { id: "seed-foundations-cohort" },
    update: {
      name: "Foundations Cohort",
      tutorId: admin.id
    },
    create: {
      id: "seed-foundations-cohort",
      name: "Foundations Cohort",
      tutorId: admin.id
    }
  });

  await prisma.classroomMember.upsert({
    where: { classroomId_userId: { classroomId: classroom.id, userId: studentA.id } },
    update: { role: "STUDENT" },
    create: {
      classroomId: classroom.id,
      userId: studentA.id,
      role: "STUDENT"
    }
  });

  await prisma.classroomMember.upsert({
    where: { classroomId_userId: { classroomId: classroom.id, userId: studentB.id } },
    update: { role: "STUDENT" },
    create: {
      classroomId: classroom.id,
      userId: studentB.id,
      role: "STUDENT"
    }
  });

  const seedUsers = [admin, studentA, studentB];
  await prisma.practiceAnswer.deleteMany({
    where: {
      userId: { in: seedUsers.map((user) => user.id) }
    }
  });
  await prisma.practiceSession.deleteMany({
    where: {
      userId: { in: seedUsers.map((user) => user.id) }
    }
  });

  const questionMap = new Map(
    (
      await prisma.question.findMany({
        select: {
          id: true,
          externalId: true,
          correctChoiceId: true
        }
      })
    )
      .filter((question) => question.externalId)
      .map((question) => [question.externalId as string, question])
  );

  async function createSessionWithAnswers(input: {
    userId: string;
    section: string;
    difficulty?: string | null;
    domain?: string | null;
    items: Array<{ externalId: string; correct: boolean; responseTimeMs: number }>;
  }) {
    const session = await prisma.practiceSession.create({
      data: {
        userId: input.userId,
        section: input.section,
        difficulty: input.difficulty ?? null,
        domain: input.domain ?? null,
        totalQuestions: input.items.length
      }
    });

    let correctAnswers = 0;

    for (const [index, item] of input.items.entries()) {
      const question = questionMap.get(item.externalId);
      if (!question?.correctChoiceId) {
        continue;
      }

      const choices = await prisma.questionChoice.findMany({
        where: { questionId: question.id },
        orderBy: { sortOrder: "asc" }
      });

      const selectedChoice = item.correct
        ? question.correctChoiceId
        : choices.find((choice) => choice.id !== question.correctChoiceId)?.id ?? question.correctChoiceId;

      if (item.correct) {
        correctAnswers += 1;
      }

      await prisma.practiceAnswer.create({
        data: {
          sessionId: session.id,
          userId: input.userId,
          questionId: question.id,
          selectedChoice,
          isCorrect: item.correct,
          responseTimeMs: item.responseTimeMs,
          attemptNumber: index === 0 ? 1 : 1
        }
      });
    }

    await prisma.practiceSession.update({
      where: { id: session.id },
      data: {
        correctAnswers,
        completedAt: new Date()
      }
    });

    return session;
  }

  await createSessionWithAnswers({
    userId: admin.id,
    section: "READING_WRITING",
    items: [
      { externalId: "seed-rw-1", correct: true, responseTimeMs: 38000 },
      { externalId: "seed-rw-3", correct: true, responseTimeMs: 32000 },
      { externalId: "seed-rw-5", correct: false, responseTimeMs: 54000 },
      { externalId: "seed-rw-7", correct: true, responseTimeMs: 27000 }
    ]
  });

  await createSessionWithAnswers({
    userId: admin.id,
    section: "MATH",
    items: [
      { externalId: "seed-math-1", correct: true, responseTimeMs: 24000 },
      { externalId: "seed-math-2", correct: false, responseTimeMs: 61000 },
      { externalId: "seed-math-4", correct: true, responseTimeMs: 22000 },
      { externalId: "seed-math-6", correct: true, responseTimeMs: 29000 }
    ]
  });

  await prisma.practiceAnswer.create({
    data: {
      sessionId: (
        await prisma.practiceSession.create({
          data: {
            userId: admin.id,
            section: "MATH",
            totalQuestions: 1,
            correctAnswers: 1,
            completedAt: new Date()
          }
        })
      ).id,
      userId: admin.id,
      questionId: questionMap.get("seed-math-2")!.id,
      selectedChoice: questionMap.get("seed-math-2")!.correctChoiceId!,
      isCorrect: true,
      responseTimeMs: 34000,
      attemptNumber: 2
    }
  });

  await createSessionWithAnswers({
    userId: studentA.id,
    section: "READING_WRITING",
    items: [
      { externalId: "seed-rw-2", correct: true, responseTimeMs: 26000 },
      { externalId: "seed-rw-4", correct: true, responseTimeMs: 20000 },
      { externalId: "seed-rw-6", correct: false, responseTimeMs: 47000 },
      { externalId: "seed-rw-8", correct: false, responseTimeMs: 52000 }
    ]
  });

  await createSessionWithAnswers({
    userId: studentA.id,
    section: "MATH",
    items: [
      { externalId: "seed-math-3", correct: true, responseTimeMs: 21000 },
      { externalId: "seed-math-5", correct: false, responseTimeMs: 45000 },
      { externalId: "seed-math-7", correct: true, responseTimeMs: 25000 },
      { externalId: "seed-math-8", correct: false, responseTimeMs: 56000 }
    ]
  });

  await createSessionWithAnswers({
    userId: studentB.id,
    section: "READING_WRITING",
    items: [
      { externalId: "seed-rw-1", correct: false, responseTimeMs: 42000 },
      { externalId: "seed-rw-3", correct: false, responseTimeMs: 39000 },
      { externalId: "seed-rw-7", correct: true, responseTimeMs: 24000 },
      { externalId: "seed-rw-8", correct: true, responseTimeMs: 31000 }
    ]
  });

  await createSessionWithAnswers({
    userId: studentB.id,
    section: "MATH",
    items: [
      { externalId: "seed-math-1", correct: true, responseTimeMs: 18000 },
      { externalId: "seed-math-4", correct: true, responseTimeMs: 19000 },
      { externalId: "seed-math-6", correct: false, responseTimeMs: 48000 },
      { externalId: "seed-math-8", correct: true, responseTimeMs: 30000 }
    ]
  });
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
