import { sequence } from "@sveltejs/kit/hooks";
import { redirect, type Handle } from "@sveltejs/kit";
import { paraglideMiddleware } from "$lib/paraglide/server";
import { validateSession } from "$lib/server/auth";
import { getDb } from "$lib/db";
import {
  getCanvasIntegration,
  shouldSync,
  syncCanvasTasks,
} from "$lib/server/canvas-sync";

const handleParaglide: Handle = ({ event, resolve }) =>
  paraglideMiddleware(event.request, ({ request, locale }) => {
    event.request = request;

    return resolve(event, {
      transformPageChunk: ({ html }) =>
        html.replace("%paraglide.lang%", locale),
    });
  });

const handleAuth: Handle = async ({ event, resolve }) => {
  const d1 = event.platform?.env?.DATABASE;
  const sessionSecret = event.platform?.env?.AUTH_SESSION_SECRET;

  if (d1 && sessionSecret) {
    const result = await validateSession(event.cookies, d1, {
      AUTH_SESSION_SECRET: sessionSecret,
    });
    event.locals.user = result?.user ?? null;
  } else {
    event.locals.user = null;
  }

  return resolve(event);
};

const handleAuthGuard: Handle = async ({ event, resolve }) => {
  const { user } = event.locals;
  const { pathname } = event.url;

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/auth");

  // Redirect logged-in users away from auth pages
  if (user && pathname === "/login") {
    redirect(303, "/dashboard");
  }

  // Protect all non-auth routes (allow "/" for everyone — it's the public landing page)
  if (!user && !isAuthRoute && pathname !== "/") {
    redirect(303, "/login");
  }

  return resolve(event);
};

/**
 * Canvas sync hook — fires after auth on every request for logged-in users.
 *
 * It checks whether the user has a Canvas integration and whether enough
 * time has passed since the last successful sync (1 hour).  If so, it
 * kicks off a sync in the background using `event.platform.context.waitUntil`
 * (Cloudflare Workers) so the page load is not blocked.
 *
 * If `waitUntil` is not available (e.g. local dev), the sync runs as a
 * fire-and-forget promise — errors are caught and logged, never thrown.
 */
const handleCanvasSync: Handle = async ({ event, resolve }) => {
  const user = event.locals.user;
  const d1 = event.platform?.env?.DATABASE;

  if (user && d1) {
    const db = getDb(d1);

    try {
      const integration = await getCanvasIntegration(db, user.id);

      if (integration && shouldSync(integration)) {
        const syncPromise = syncCanvasTasks(db, user.id, integration)
          .then((result) => {
            console.log(
              `[canvas-sync] Synced for ${user.email}: ` +
              `created=${result.created} updated=${result.updated} ` +
              `completed=${result.completed} errors=${result.errors.length}`,
            );
          })
          .catch((err) => {
            console.error(`[canvas-sync] Sync failed for ${user.email}:`, err);
          });

        // Use waitUntil if available (Cloudflare Workers) so the response
        // is not held up.  Otherwise let the promise float — we've already
        // attached a .catch() so unhandled-rejection won't fire.
        if (event.platform?.context?.waitUntil) {
          event.platform.context.waitUntil(syncPromise);
        }
      }
    } catch (err) {
      // Never block the request because of a sync issue
      console.error("[canvas-sync] Error checking sync status:", err);
    }
  }

  return resolve(event);
};

export const handle: Handle = sequence(
  handleParaglide,
  handleAuth,
  handleAuthGuard,
  handleCanvasSync,
);
