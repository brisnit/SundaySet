"use server";

import {
  InvalidTokenError,
  respondToInvitation,
  type ResponseOutcome,
} from "@/lib/data/invitations";
import { respondSchema } from "@/lib/validation/assignment";

export type RespondResult = { error?: string };

/**
 * The token is the whole authorization — there is no session here.
 * No church, service or member id is accepted from the client.
 */
export async function respondAction(
  token: string,
  outcome: ResponseOutcome,
): Promise<RespondResult> {
  const parsed = respondSchema.safeParse({ token, outcome });
  if (!parsed.success) return { error: "That link is not valid." };

  try {
    await respondToInvitation(parsed.data.token, parsed.data.outcome);
  } catch (e) {
    if (e instanceof InvalidTokenError) {
      return {
        error:
          e.reason === "EXPIRED"
            ? "This link has expired. Ask your worship leader for a new one."
            : "That link is not valid.",
      };
    }
    throw e;
  }
  return {};
}
