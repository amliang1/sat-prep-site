import { prisma } from "../src/lib/prisma";
import { importCollegeBoardQuestions } from "../src/lib/importers/collegeboard";

async function main() {
  const limit = Number(process.argv[2] ?? 40);
  const result = await importCollegeBoardQuestions(limit);
  console.log(`Imported ${result.imported} questions, skipped ${result.skipped}.`);
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
