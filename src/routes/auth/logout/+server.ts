import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { deleteSessionCookie, revokeUserSessions } from "$lib/server/auth";

export const POST: RequestHandler = async ({ cookies, platform, locals }) => {
  if (platform?.env?.DATABASE && locals.user) {
    await revokeUserSessions(platform.env.DATABASE, locals.user.id);
  }

  deleteSessionCookie(cookies);

  redirect(303, "/login");
};
