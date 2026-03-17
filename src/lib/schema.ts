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
  description: text("description"), // user-visible description (synced from Canvas, overridden by local edits)
  canvasDescription: text("canvas_description"), // read-only snapshot of Canvas assignment description
  dueAt: text("due_at"), // ISO date string e.g. "2025-01-15T12:00:00Z"
  completedAt: text("completed_at"), // ISO datetime string, null if not complete
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),

  // Canvas sync columns
  canvasId: text("canvas_id"), // Canvas assignment ID (unique per user context)
  canvasCourseId: text("canvas_course_id"), // Canvas course ID this assignment belongs to
  source: text("source").notNull().default("manual"), // "manual" or "canvas"
  syncedAt: text("synced_at"), // ISO datetime – when this task was last synced from Canvas
  lastLocalEdit: text("last_local_edit"), // ISO datetime – when user last edited this task locally
});

export const canvasIntegrations = sqliteTable("canvas_integrations", {
  id: text("id").primaryKey(), // crypto.randomUUID()
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  canvasUrl: text("canvas_url").notNull(), // e.g. "https://pgcc.instructure.com"
  apiToken: text("api_token").notNull(), // Canvas API access token (encrypted at rest)
  lastSyncAt: text("last_sync_at"), // ISO datetime – only updated after a fully successful sync
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const canvasSyncLogs = sqliteTable("canvas_sync_logs", {
  id: text("id").primaryKey(), // crypto.randomUUID()
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // "success" | "error" | "partial"
  tasksCreated: integer("tasks_created", { mode: "number" })
    .notNull()
    .default(0),
  tasksUpdated: integer("tasks_updated", { mode: "number" })
    .notNull()
    .default(0),
  tasksCompleted: integer("tasks_completed", { mode: "number" })
    .notNull()
    .default(0),
  errorMessage: text("error_message"),
  syncedAt: text("synced_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const passkeyCredentials = sqliteTable("passkey_credentials", {
  id: text("id").primaryKey(), // crypto.randomUUID()
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  credentialId: text("credential_id").notNull().unique(), // base64url credential ID
  publicKey: text("public_key").notNull(), // base64url-encoded public key bytes
  counter: integer("counter", { mode: "number" }).notNull().default(0),
  transports: text("transports"), // JSON array of authenticator transports
  backedUp: integer("backed_up", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// Inferred types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type CanvasIntegration = typeof canvasIntegrations.$inferSelect;
export type NewCanvasIntegration = typeof canvasIntegrations.$inferInsert;
export type CanvasSyncLog = typeof canvasSyncLogs.$inferSelect;
export type NewCanvasSyncLog = typeof canvasSyncLogs.$inferInsert;
export type PasskeyCredential = typeof passkeyCredentials.$inferSelect;
export type NewPasskeyCredential = typeof passkeyCredentials.$inferInsert;
