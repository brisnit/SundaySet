"use server";

import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn } from "@/auth";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await signIn("password", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/home",
    });
    return {};
  } catch (error) {
    // signIn signals success by throwing a redirect — only auth failures are
    // ours to report, everything else must propagate.
    if (error instanceof AuthError) {
      return { error: "That email and password don't match an account." };
    }
    throw error;
  }
}
