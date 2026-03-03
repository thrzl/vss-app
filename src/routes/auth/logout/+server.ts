import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { deleteSessionCookie, invalidateAllSessions } from "$lib/server/auth";

export const POST: RequestHandler = async ({ locals, cookies, platform }) => {
  deleteSessionCookie(cookies);
  redirect(303, "/login");
};
