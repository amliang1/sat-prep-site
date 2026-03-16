import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  await createSession(user);
  await trackEvent({ type: "LOGIN", userId: user.id, metadata: { method: "password" } });
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
