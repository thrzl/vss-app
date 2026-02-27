import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  deleteSessionCookie,
  invalidateAllSessions,
} from "$lib/server/auth";

export const POST: RequestHandler = async ({ locals, cookies, platform }) => {
  if (locals.user && platform?.env?.DATABASE) {
    await invalidateAllSessions(locals.user.id, platform.env.DATABASE);
  }

  deleteSessionCookie(cookies);
  redirect(303, "/login");
};
