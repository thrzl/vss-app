import { json, type RequestHandler } from "@sveltejs/kit";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { verifyPasskey } from "$lib/server/auth";

export const POST: RequestHandler = async ({ request, cookies, platform, url }) => {
    const env = platform?.env;

    if (!env?.DATABASE || !env.AUTH_SESSION_SECRET) {
        return json({ error: "auth_not_configured" }, { status: 500 });
    }

    const body = (await request.json()) as {
        mode?: unknown;
        response?: unknown;
    };

    if (body.mode !== "register" && body.mode !== "login") {
        return json({ error: "invalid_mode" }, { status: 400 });
    }

    if (!body.response || typeof body.response !== "object") {
        return json({ error: "invalid_response" }, { status: 400 });
    }

    try {
        const user = await verifyPasskey(
            cookies,
            env.DATABASE,
            {
                AUTH_SESSION_SECRET: env.AUTH_SESSION_SECRET,
                PASSKEY_RP_ID: env.PASSKEY_RP_ID,
                PASSKEY_RP_NAME: env.PASSKEY_RP_NAME,
                PASSKEY_ORIGIN: env.PASSKEY_ORIGIN,
            },
            url,
            body.mode,
            body.response as RegistrationResponseJSON | AuthenticationResponseJSON,
        );

        if (!user) {
            return json({ error: "verification_failed" }, { status: 401 });
        }

        return json({ ok: true });
    } catch {
        return json({ error: "verification_failed" }, { status: 401 });
    }
};
