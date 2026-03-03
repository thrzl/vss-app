import type { PageServerLoad, Actions } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { getDb } from "$lib/db";
import { users, canvasIntegrations } from "$lib/schema";
import {
  generateTotpSecret,
  getTotpKeyUri,
  verifyTotpCode,
  createSessionToken,
  setSessionCookie,
  invalidateAllSessions,
} from "$lib/server/auth";
import { verifyToken } from "$lib/server/canvas-api";
import { getCanvasIntegration, syncCanvasTasks } from "$lib/server/canvas-sync";

export const load: PageServerLoad = async ({ locals, platform }) => {
  if (!locals.user) {
    redirect(303, "/login");
  }

  const db = getDb(platform!.env.DATABASE);
  const integration = await getCanvasIntegration(db, locals.user.id);

  return {
    user: locals.user,
    canvas: integration
      ? {
          connected: true,
          canvasUrl: integration.canvasUrl,
          lastSyncAt: integration.lastSyncAt,
          createdAt: integration.createdAt,
        }
      : {
          connected: false,
          canvasUrl: null,
          lastSyncAt: null,
          createdAt: null,
        },
  };
};

export const actions: Actions = {
  update_name: async ({ request, locals, platform }) => {
    if (!locals.user) return fail(401, { message: "Unauthorized." });

    const formData = await request.formData();
    const name = (formData.get("name") as string)?.trim();

    if (!name || name.length === 0) {
      return fail(400, {
        action: "update_name" as const,
        message: "Name is required.",
      });
    }

    if (name.length > 100) {
      return fail(400, {
        action: "update_name" as const,
        message: "Name must be 100 characters or fewer.",
      });
    }

    const db = getDb(platform!.env.DATABASE);

    try {
      await db.update(users).set({ name }).where(eq(users.id, locals.user.id));
    } catch {
      return fail(500, {
        action: "update_name" as const,
        message: "Failed to update name.",
      });
    }

    return { action: "update_name" as const, success: true };
  },

  /**
   * Step 1 of TOTP rotation — generate a new secret and return the QR URI.
   * The new secret is NOT saved to DB yet; the user must confirm with a valid code first.
   */
  rotate_totp_start: async ({ locals }) => {
    if (!locals.user) return fail(401, { message: "Unauthorized." });

    const newSecret = generateTotpSecret();
    const uri = getTotpKeyUri(locals.user.email, newSecret);

    return {
      action: "rotate_totp" as const,
      step: "confirm" as const,
      totpUri: uri,
      totpSecret: newSecret,
    };
  },

  /**
   * Step 2 of TOTP rotation — user confirms the new secret by entering a valid code.
   * If valid, save the new secret to DB and invalidate existing sessions (re-issue a new one).
   */
  rotate_totp_confirm: async ({ request, locals, cookies, platform }) => {
    if (!locals.user) return fail(401, { message: "Unauthorized." });

    const formData = await request.formData();
    const code = (formData.get("code") as string)?.trim();
    const newSecret = (formData.get("totp_secret") as string)?.trim();

    if (!code || !newSecret) {
      const uri = getTotpKeyUri(locals.user.email, newSecret || "");
      return fail(400, {
        action: "rotate_totp" as const,
        step: "confirm" as const,
        totpUri: uri,
        totpSecret: newSecret || "",
        message: "Verification code is required.",
      });
    }

    if (!verifyTotpCode(newSecret, code)) {
      const uri = getTotpKeyUri(locals.user.email, newSecret);
      return fail(400, {
        action: "rotate_totp" as const,
        step: "confirm" as const,
        totpUri: uri,
        totpSecret: newSecret,
        message: "Invalid or expired code. Please try again.",
      });
    }

    const d1 = platform!.env.DATABASE;
    const env = platform!.env;
    const db = getDb(d1);

    try {
      // Save the new TOTP secret
      await db
        .update(users)
        .set({ totpSecret: newSecret })
        .where(eq(users.id, locals.user.id));

      // Invalidate all existing sessions
      await invalidateAllSessions(locals.user.id, d1);

      // Re-fetch the updated user to get the new tokenVersion
      const [updatedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, locals.user.id))
        .limit(1);

      if (updatedUser) {
        // Issue a fresh session token so the current session stays valid
        const token = await createSessionToken(updatedUser, {
          JWT_SECRET: env.JWT_SECRET,
        });
        setSessionCookie(cookies, token);
      }
    } catch {
      return fail(500, {
        action: "rotate_totp" as const,
        message: "Failed to update authenticator secret.",
      });
    }

    return {
      action: "rotate_totp" as const,
      step: "done" as const,
      success: true,
    };
  },

  // -------------------------------------------------------------------------
  // Canvas integration actions
  // -------------------------------------------------------------------------

  /**
   * Connect a Canvas LMS account by saving the instance URL and API token.
   * The token is verified against the Canvas API before saving.
   */
  canvas_connect: async ({ request, locals, platform }) => {
    if (!locals.user) return fail(401, { message: "Unauthorized." });

    const formData = await request.formData();
    let canvasUrl = (formData.get("canvas_url") as string)?.trim();
    const apiToken = (formData.get("api_token") as string)?.trim();

    if (!canvasUrl) {
      return fail(400, {
        action: "canvas_connect" as const,
        message: "Canvas URL is required.",
      });
    }

    if (!apiToken) {
      return fail(400, {
        action: "canvas_connect" as const,
        message: "API token is required.",
      });
    }

    // Normalise URL — strip trailing slashes, ensure https
    try {
      const parsed = new URL(
        canvasUrl.startsWith("http") ? canvasUrl : `https://${canvasUrl}`,
      );
      canvasUrl = parsed.origin; // e.g. "https://pgcc.instructure.com"
    } catch {
      return fail(400, {
        action: "canvas_connect" as const,
        message: "Invalid Canvas URL.",
      });
    }

    // Verify the token actually works
    const valid = await verifyToken(canvasUrl, apiToken);
    if (!valid) {
      return fail(400, {
        action: "canvas_connect" as const,
        message:
          "Could not connect to Canvas. Please check your URL and token.",
      });
    }

    const db = getDb(platform!.env.DATABASE);

    try {
      // Check if user already has an integration (upsert)
      const existing = await getCanvasIntegration(db, locals.user.id);

      if (existing) {
        await db
          .update(canvasIntegrations)
          .set({
            canvasUrl,
            apiToken,
            lastSyncAt: null, // reset so sync runs immediately
          })
          .where(eq(canvasIntegrations.id, existing.id));
      } else {
        await db.insert(canvasIntegrations).values({
          id: crypto.randomUUID(),
          userId: locals.user.id,
          canvasUrl,
          apiToken,
          lastSyncAt: null,
        });
      }
    } catch {
      return fail(500, {
        action: "canvas_connect" as const,
        message: "Failed to save Canvas integration.",
      });
    }

    return { action: "canvas_connect" as const, success: true };
  },

  /**
   * Disconnect Canvas — removes the integration row.  Synced tasks are
   * kept so the user doesn't lose their data.
   */
  canvas_disconnect: async ({ locals, platform }) => {
    if (!locals.user) return fail(401, { message: "Unauthorized." });

    const db = getDb(platform!.env.DATABASE);

    try {
      await db
        .delete(canvasIntegrations)
        .where(eq(canvasIntegrations.userId, locals.user.id));
    } catch {
      return fail(500, {
        action: "canvas_disconnect" as const,
        message: "Failed to disconnect Canvas.",
      });
    }

    return { action: "canvas_disconnect" as const, success: true };
  },

  /**
   * Trigger a manual Canvas sync (ignores the 1-hour threshold).
   */
  canvas_sync: async ({ locals, platform }) => {
    if (!locals.user) return fail(401, { message: "Unauthorized." });

    const db = getDb(platform!.env.DATABASE);
    const integration = await getCanvasIntegration(db, locals.user.id);

    if (!integration) {
      return fail(400, {
        action: "canvas_sync" as const,
        message: "Canvas is not connected.",
      });
    }

    try {
      const result = await syncCanvasTasks(db, locals.user.id, integration);

      if (result.errors.length > 0) {
        return fail(500, {
          action: "canvas_sync" as const,
          message: `Sync completed with errors: ${result.errors[0]}`,
          result,
        });
      }

      return {
        action: "canvas_sync" as const,
        success: true,
        result,
      };
    } catch (err) {
      return fail(500, {
        action: "canvas_sync" as const,
        message: `Sync failed: ${String(err)}`,
      });
    }
  },
};
