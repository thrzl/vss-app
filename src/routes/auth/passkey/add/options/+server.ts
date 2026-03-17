import { json, type RequestHandler } from "@sveltejs/kit";
import { createAdditionalPasskeyOptions } from "$lib/server/auth";

export const POST: RequestHandler = async ({ cookies, platform, url, locals }) => {
    const env = platform?.env;

    if (!env?.DATABASE || !env.AUTH_SESSION_SECRET) {
        return json({ error: "auth_not_configured" }, { status: 500 });
    }

    if (!locals.user) {
        return json({ error: "unauthorized" }, { status: 401 });
    }

    try {
        const result = await createAdditionalPasskeyOptions(
            cookies,
            env.DATABASE,
            {
                AUTH_SESSION_SECRET: env.AUTH_SESSION_SECRET,
                PASSKEY_RP_ID: env.PASSKEY_RP_ID,
                PASSKEY_RP_NAME: env.PASSKEY_RP_NAME,
                PASSKEY_ORIGIN: env.PASSKEY_ORIGIN,
            },
            url,
            locals.user,
        );

        return json(result);
    } catch (error) {
        const message = error instanceof Error
            ? error.message
            : "Unable to start passkey registration.";
        return json({ error: "passkey_options_failed", message }, { status: 400 });
    }
};
