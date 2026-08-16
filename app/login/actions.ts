"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { createSessionValue, SESSION_COOKIE } from "@/lib/session";

export async function login(formData: FormData) {
  const username = formData.get("username");
  const password = formData.get("password");

  
  if (typeof username !== "string" || typeof password !== "string") {
    redirect("/login?error=1");
  }

  // Always run bcrypt.compare, even if the username is already wrong.
  // Skipping it would make "wrong username" responses noticeably faster
  // than "wrong password" ones, leaking which case happened via timing.
  const validPassword = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH!);
  const validUsername = username === process.env.ADMIN_USERNAME;

  if (!validUsername || !validPassword) {
    redirect("/login?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  redirect("/");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
