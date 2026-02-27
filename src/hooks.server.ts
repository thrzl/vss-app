import { sequence } from "@sveltejs/kit/hooks";
import { redirect, type Handle } from "@sveltejs/kit";
import { paraglideMiddleware } from "$lib/paraglide/server";
import { validateSession } from "$lib/server/auth";

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
  const jwtSecret = event.platform?.env?.JWT_SECRET;

  if (d1 && jwtSecret) {
    const result = await validateSession(event.cookies, d1, {
      JWT_SECRET: jwtSecret,
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
    redirect(303, "/home");
  }

  // Redirect root to home (if logged in) or login (if not)
  if (pathname === "/") {
    redirect(303, user ? "/home" : "/login");
  }

  // Protect all non-auth routes
  if (!user && !isAuthRoute) {
    redirect(303, "/login");
  }

  return resolve(event);
};

export const handle: Handle = sequence(
  handleParaglide,
  handleAuth,
  handleAuthGuard,
);
