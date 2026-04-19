"use server";
import { cookies } from "next/headers";

export async function setDarkModeCookie(dark: boolean) {
  const cookieStore = await cookies();
  cookieStore.set("darkMode", dark ? "true" : "false", {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}
