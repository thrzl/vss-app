import type { PageServerLoad, Actions } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { getDb } from "$lib/db";
import { users } from "$lib/schema";
import {
  createSessionToken,
  setSessionCookie,
  generateTotpSecret,
  getTotpKeyUri,
  verifyTotpCode,
} from "$lib/server/auth";

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    redirect(303, "/dashboard");
  }
  return {};
};

export const actions: Actions = {
  /**
   * Step
 1 — User submits their email.
   * If the account exists and has TOTP set up, we tell the client to show the TOTP input.
   * If the account doesn't exist, we tell the client to show the registration/setup flow.
   */
  lookup: async ({ request, platform }) => {
    const formData = await request.formData();
    const email = (formData.get("email") as string)?.trim().toLowerCase();

    if (!email) {
      return fail(400, {
        step: "email" as const,
        message: "Email is required.",
      });
    }

    if (!email.endsWith("pgcc.edu")) {
      return fail(400, {
        step: "email" as const,
        message: "Only pgcc.edu email addresses are allowed.",
      });
    }

    const d1 = platform!.env.DATABASE;
    const db = getDb(d1);

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing && existing.totpSecret) {
      // Account exists with TOTP — prompt for code
      return { step: "totp" as const, email };
    }

    if (existing && !existing.totpSecret) {
      // Account exists but TOTP not yet set up — generate secret and return it
      // without writing to DB yet; we'll persist it only after verification.
      const secret = generateTotpSecret();
      const uri = getTotpKeyUri(email, secret);
      return {
        step: "setup" as const,
        email,
        totpUri: uri,
        totpSecret: secret,
      };
    }

    // New account — generate TOTP secret without creating a DB row yet.
    // The row will be inserted only after the user proves they can verify the code.
    const secret = generateTotpSecret();
    const uri = getTotpKeyUri(email, secret);
    return { step: "setup" as const, email, totpUri: uri, totpSecret: secret };
  },

  /**
   * Step 2a — Existing user verifies TOTP code to log in.
   */
  login: async ({ request, cookies, platform }) => {
    const formData = await request.formData();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const code = (formData.get("code") as string)?.trim();

    if (!email || !code) {
      return fail(400, {
        step: "totp" as const,
        email,
        message: "Email and code are required.",
      });
    }

    const d1 = platform!.env.DATABASE;
    const env = platform!.env;
    const db = getDb(d1);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.totpSecret) {
      return fail(400, {
        step: "totp" as const,
        email,
        message: "Account not found. Please start over.",
      });
    }

    if (!verifyTotpCode(user.totpSecret, code)) {
      return fail(400, {
        step: "totp" as const,
        email,
        message: "Invalid or expired code. Please try again.",
      });
    }

    // Issue JWT and set cookie
    const token = await createSessionToken(user, {
      JWT_SECRET: env.JWT_SECRET,
    });
    setSessionCookie(cookies, token);

    redirect(303, "/dashboard");
  },

  /**
   * Step 2b — New user confirms TOTP setup by entering their first code, then logs in.
   */
  verify_setup: async ({ request, cookies, platform }) => {
    const formData = await request.formData();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const code = (formData.get("code") as string)?.trim();
    const totpSecret = (formData.get("totp_secret") as string)?.trim();

    if (!email || !code || !totpSecret) {
      return fail(400, {
        step: "setup" as const,
        email,
        message: "All fields are required.",
      });
    }

    if (!verifyTotpCode(totpSecret, code)) {
      const uri = getTotpKeyUri(email, totpSecret);
      return fail(400, {
        step: "setup" as const,
        email,
        totpUri: uri,
        totpSecret,
        message:
          "Invalid code. Please check your authenticator app and try again.",
      });
    }

    const d1 = platform!.env.DATABASE;
    const env = platform!.env;
    const db = getDb(d1);

    // Look up any existing user record for this email.
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let user;

    if (existing) {
      // Update the existing user's TOTP secret now that it's been verified.
      await db
        .update(users)
        .set({ totpSecret })
        .where(eq(users.id, existing.id));
      user = { ...existing, totpSecret };
    } else {
      // First-time registration — create the user row now that TOTP is verified.
      const id = crypto.randomUUID();
      const name = email.split("@")[0];
      const newUser = {
        id,
        email,
        name,
        totpSecret,
        tokenVersion: 0,
      };
      await db.insert(users).values(newUser);
      user = { ...newUser, createdAt: new Date().toISOString() };
    }

    // Issue JWT and set cookie
    const token = await createSessionToken(user, {
      JWT_SECRET: env.JWT_SECRET,
    });
    setSessionCookie(cookies, token);

    redirect(303, "/dashboard");
  },
};
