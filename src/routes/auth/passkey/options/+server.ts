import { json, type RequestHandler } from "@sveltejs/kit";
import { createPasskeyOptions } from "$lib/server/auth";

export const POST: RequestHandler = async ({ request, cookies, platform, url }) => {
  const env = platform?.env;

  if (!env?.DATABASE) {
    return json({ error: "auth_not_configured" }, { status: 500 });
  }

  const body = (await request.json()) as { email?: unknown };
  if (typeof body.email !== "string") {
    return json({ error: "invalid_email" }, { status: 400 });
  }

  try {
    const result = await createPasskeyOptions(
      cookies,
      env.DATABASE,
      {
        AUTH_SESSION_SECRET: env.AUTH_SESSION_SECRET,
        PASSKEY_RP_ID: env.PASSKEY_RP_ID,
        PASSKEY_RP_NAME: env.PASSKEY_RP_NAME,
        PASSKEY_ORIGIN: env.PASSKEY_ORIGIN,
      },
      url,
      body.email,
    );

    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start passkey sign-in.";
    return json({ error: "passkey_options_failed", message }, { status: 400 });
  }
};
