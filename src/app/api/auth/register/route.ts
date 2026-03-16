import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 8) {
    return NextResponse.redirect(new URL("/register", request.url));
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password)
    }
  });

  await createSession(user);
  await trackEvent({ type: "LOGIN", userId: user.id, metadata: { method: "register" } });
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
