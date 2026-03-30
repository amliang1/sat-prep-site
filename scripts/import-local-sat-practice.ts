import { prisma } from "../src/lib/prisma";
import { importLocalSatPracticeAi, upsertImportedSatQuestions } from "../src/lib/importers/local-sat";
import { execFileSync } from "node:child_process";

async function main() {
  const useAi = process.argv.includes("--ai");
  if (useAi) {
    const { imported, totalParsed } = await importLocalSatPracticeAi();
    console.log(`Imported ${imported} AI-parsed SAT practice questions from ${totalParsed} parsed records.`);
    return;
  }

  const output = execFileSync("python3", ["scripts/parse_sat_practice_pdfs.py"], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  });

  const imported = await upsertImportedSatQuestions(JSON.parse(output));
  console.log(`Imported ${imported} local SAT practice questions.`);
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
