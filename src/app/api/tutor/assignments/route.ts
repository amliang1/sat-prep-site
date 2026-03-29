import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/tutor/assignments
 * Creates a new classroom assignment.
 */
export async function POST(request: Request) {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "TUTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const classroomId = String(formData.get("classroomId"));
  const name = String(formData.get("name") ?? "").trim();
  const description = formData.get("description") ? String(formData.get("description")) : undefined;
  const dueDateRaw = formData.get("dueDate");
  const dueDate = dueDateRaw ? new Date(String(dueDateRaw)) : undefined;

  if (!classroomId || !name) {
    return NextResponse.json({ error: "classroomId and name are required" }, { status: 400 });
  }

  // Verify this tutor owns the classroom
  const classroom = await prisma.classroom.findFirst({
    where: { id: classroomId, tutorId: user.id }
  });

  if (!classroom) {
    return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
  }

  await prisma.assignment.create({
    data: {
      classroomId,
      tutorId: user.id,
      name,
      description,
      dueDate
    }
  });

  return NextResponse.redirect(new URL(`/tutor/classrooms/${classroomId}`, request.url));
}
