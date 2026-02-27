import type { PageServerLoad } from "./$types";
import { desc, eq } from "drizzle-orm";
import { getDb } from "$lib/db";
import { tasks } from "$lib/schema";

export const load: PageServerLoad = async ({ locals, platform }) => {
  if (!locals.user) {
    return { tasks: [] };
  }

  const db = getDb(platform!.env.DATABASE);

  const result = await db
    .select()
    .from(tasks)
    .where(eq(tasks.owner, locals.user.id))
    .orderBy(desc(tasks.createdAt));

  return { tasks: result };
};
