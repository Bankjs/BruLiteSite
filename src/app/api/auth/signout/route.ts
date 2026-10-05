import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { env } from "@/lib/env";

export async function POST() {
  const res = NextResponse.redirect(`${env.APP_URL}/`);
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
