import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { eq, and, desc } from "drizzle-orm";
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

export const actions: Actions = {
  create: async ({ request, locals, platform }) => {
    if (!locals.user) return fail(401, { message: "Unauthorized." });

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const due_at = formData.get("due_at") as string | null;

    if (!title?.trim()) {
      return fail(400, { message: "Title is required." });
    }

    const db = getDb(platform!.env.DATABASE);

    try {
      await db.insert(tasks).values({
        title: title.trim(),
        description: description?.trim() || null,
        dueAt: due_at ? `${due_at}T12:00:00Z` : null,
        owner: locals.user.id,
        status: 0,
      });
    } catch {
      return fail(500, { message: "Failed to create task." });
    }
  },

  update: async ({ request, locals, platform }) => {
    if (!locals.user) return fail(401, { message: "Unauthorized." });

    const formData = await request.formData();
    const id = Number(formData.get("id"));
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const due_at = formData.get("due_at") as string | null;

    if (!id) return fail(400, { message: "Task ID is required." });
    if (!title?.trim()) return fail(400, { message: "Title is required." });

    const db = getDb(platform!.env.DATABASE);

    try {
      await db
        .update(tasks)
        .set({
          title: title.trim(),
          description: description?.trim() || null,
          dueAt: due_at ? `${due_at}T12:00:00Z` : null,
          lastLocalEdit: new Date().toISOString(),
        })
        .where(and(eq(tasks.id, id), eq(tasks.owner, locals.user.id)));
    } catch {
      return fail(500, { message: "Failed to update task." });
    }
  },

  toggle: async ({ request, locals, platform }) => {
    if (!locals.user) return fail(401, { message: "Unauthorized." });

    const formData = await request.formData();
    const id = Number(formData.get("id"));
    const current = Number(formData.get("status") ?? 0);

    if (!id) return fail(400, { message: "Task ID is required." });

    const newStatus = current === 1 ? 0 : 1;
    const completedAt = newStatus === 1 ? new Date().toISOString() : null;

    const db = getDb(platform!.env.DATABASE);

    try {
      await db
        .update(tasks)
        .set({
          status: newStatus,
          completedAt,
          lastLocalEdit: new Date().toISOString(),
        })
        .where(and(eq(tasks.id, id), eq(tasks.owner, locals.user.id)));
    } catch {
      return fail(500, { message: "Failed to toggle task." });
    }
  },

  delete: async ({ request, locals, platform }) => {
    if (!locals.user) return fail(401, { message: "Unauthorized." });

    const formData = await request.formData();
    const id = Number(formData.get("id"));

    if (!id) return fail(400, { message: "Task ID is required." });

    const db = getDb(platform!.env.DATABASE);

    try {
      await db
        .delete(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.owner, locals.user.id)));
    } catch {
      return fail(500, { message: "Failed to delete task." });
    }
  },
};
