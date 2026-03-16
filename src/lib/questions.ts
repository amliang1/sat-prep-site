import { Prisma } from "@prisma/client";
import { Difficulty, Section } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export type QuestionFilters = {
  section?: Section | "ALL";
  domain?: string;
  difficulty?: Difficulty | "ALL";
  tag?: string;
  search?: string;
};

export async function getQuestionFilters() {
  const [domains, tags] = await Promise.all([
    prisma.question.findMany({
      distinct: ["domain"],
      select: { domain: true },
      orderBy: { domain: "asc" }
    }),
    prisma.tag.findMany({
      select: { name: true },
      orderBy: { name: "asc" }
    })
  ]);

  return {
    domains: domains.map((item) => item.domain),
    tags: tags.map((item) => item.name)
  };
}

export function buildQuestionWhere(filters: QuestionFilters): Prisma.QuestionWhereInput {
  const where: Prisma.QuestionWhereInput = {};

  if (filters.section && filters.section !== "ALL") {
    where.section = filters.section;
  }

  if (filters.domain) {
    where.domain = filters.domain;
  }

  if (filters.difficulty && filters.difficulty !== "ALL") {
    where.difficulty = filters.difficulty;
  }

  if (filters.tag) {
    where.tags = {
      some: {
        tag: {
          name: filters.tag
        }
      }
    };
  }

  if (filters.search) {
    where.OR = [
      { prompt: { contains: filters.search } },
      { skill: { contains: filters.search } },
      { testName: { contains: filters.search } }
    ];
  }

  return where;
}

export async function getQuestions(filters: QuestionFilters) {
  return prisma.question.findMany({
    where: buildQuestionWhere(filters),
    include: {
      choices: {
        orderBy: { sortOrder: "asc" }
      },
      tags: {
        include: { tag: true }
      }
    },
    orderBy: [{ section: "asc" }, { domain: "asc" }, { createdAt: "desc" }]
  });
}
