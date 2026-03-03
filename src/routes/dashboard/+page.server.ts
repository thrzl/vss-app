import type { PageServerLoad } from "./$types";
import { desc, eq } from "drizzle-orm";
import { getDb } from "$lib/db";
import { tasks } from "$lib/schema";

export const load: PageServerLoad = async ({ locals, platform }) => {
  if (!locals.user) {
    return {
      tasks: [],
      todayTasks: [],
      overdueTasks: [],
      stats: { total: 0, dueToday: 0, overdue: 0, completed: 0 },
      todayString: new Date().toISOString().split("T")[0],
    };
  }

  const db = getDb(platform!.env.DATABASE);

  const result = await db
    .select()
    .from(tasks)
    .where(eq(tasks.owner, locals.user.id))
    .orderBy(desc(tasks.createdAt));

  const todayString = new Date().toISOString().split("T")[0];

  const activeTasks = result.filter((t) => (t.status ?? 0) === 0);
  const completedTasks = result.filter((t) => (t.status ?? 0) === 1);

  const todayTasks = activeTasks.filter(
    (t) => t.dueAt && t.dueAt.startsWith(todayString),
  );

  const overdueTasks = activeTasks.filter(
    (t) => t.dueAt && t.dueAt.split("T")[0] < todayString,
  );

  const stats = {
    total: activeTasks.length,
    dueToday: todayTasks.length,
    overdue: overdueTasks.length,
    completed: completedTasks.length,
  };

  return {
    tasks: result,
    todayTasks,
    overdueTasks,
    stats,
    todayString,
  };
};
