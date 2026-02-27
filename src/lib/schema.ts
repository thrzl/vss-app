import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // crypto.randomUUID()
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  totpSecret: text("totp_secret"), // null until TOTP setup is completed
  tokenVersion: integer("token_version").notNull().default(0), // incremented on logout to invalidate JWTs
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const tasks = sqliteTable("tasks", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  status: integer("status", { mode: "number" }).notNull().default(0), // 0 = pending, 1 = complete
  owner: text("owner")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  url: text("url"),
  dueAt: text("due_at"), // ISO date string e.g. "2025-01-15T12:00:00Z"
  completedAt: text("completed_at"), // ISO datetime string, null if not complete
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// Inferred types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
