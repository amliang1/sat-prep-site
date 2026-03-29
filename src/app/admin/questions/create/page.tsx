import { requireAdmin } from "@/lib/auth";
import QuestionEditorClient from "./editor-client";

const DOMAINS = {
  READING_WRITING: ["Information and Ideas", "Craft and Structure", "Expression of Ideas", "Standard English Conventions"],
  MATH: ["Algebra", "Advanced Math", "Problem-Solving and Data Analysis", "Geometry and Trigonometry"]
};

type Props = { searchParams: Promise<{ success?: string }> };

export default async function CreateQuestionPage({ searchParams }: Props) {
  await requireAdmin();
  const { success } = await searchParams;
  return <QuestionEditorClient successId={success} constants={{ domains: DOMAINS }} />;
}
