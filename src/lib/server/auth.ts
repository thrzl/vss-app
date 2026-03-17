import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { SignJWT, jwtVerify } from "jose";
import { and, eq, sql } from "drizzle-orm";
import type { Cookies } from "@sveltejs/kit";
import { getDb } from "$lib/db";
import { passkeyCredentials, users, type User } from "$lib/schema";

const SESSION_COOKIE = "session";
const AUTH_FLOW_COOKIE = "auth_flow";
const AUTH_FLOW_TTL_SECONDS = 60 * 10;
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export interface AuthEnv {
  AUTH_SESSION_SECRET: string;
  PASSKEY_RP_ID?: string;
  PASSKEY_RP_NAME?: string;
  PASSKEY_ORIGIN?: string;
}

interface AuthFlowState {
  challenge: string;
  type: "register" | "login";
  userId: string;
  email: string;
}

interface SessionClaims {
  sub: string;
  tv: number;
}

export interface PasskeyOptionsResult {
  mode: "register" | "login";
  options: PublicKeyCredentialCreationOptionsJSON | PublicKeyCredentialRequestOptionsJSON;
}

function getSessionSecret(env: AuthEnv): Uint8Array {
  const secret = env.AUTH_SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing AUTH_SESSION_SECRET");
  }

  return new TextEncoder().encode(secret);
}

function parseAuthFlowCookie(cookies: Cookies): AuthFlowState | null {
  const raw = cookies.get(AUTH_FLOW_COOKIE);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AuthFlowState>;

    if (
      typeof parsed.challenge !== "string" ||
      (parsed.type !== "register" && parsed.type !== "login") ||
      typeof parsed.userId !== "string" ||
      typeof parsed.email !== "string"
    ) {
      return null;
    }

    return {
      challenge: parsed.challenge,
      type: parsed.type,
      userId: parsed.userId,
      email: parsed.email,
    };
  } catch {
    return null;
  }
}

function setAuthFlowState(cookies: Cookies, flow: AuthFlowState): void {
  cookies.set(AUTH_FLOW_COOKIE, JSON.stringify(flow), {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: AUTH_FLOW_TTL_SECONDS,
  });
}

export function clearAuthFlowState(cookies: Cookies): void {
  cookies.delete(AUTH_FLOW_COOKIE, { path: "/" });
}

function normalizeInstitutionEmail(emailInput: string): string {
  const normalized = emailInput.trim().toLowerCase();
  if (!isAllowedInstitutionEmail(normalized)) {
    throw new Error("Please use your institutional email address.");
  }
  return normalized;
}

function getRpId(env: AuthEnv, requestUrl: URL): string {
  return env.PASSKEY_RP_ID?.trim() || requestUrl.hostname;
}

function getRpName(env: AuthEnv): string {
  return env.PASSKEY_RP_NAME?.trim() || "VSS App";
}

function getExpectedOrigin(env: AuthEnv, requestUrl: URL): string {
  return env.PASSKEY_ORIGIN?.trim() || requestUrl.origin;
}

function bytesToBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBytes(value: string): Uint8Array {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function parseTransports(
  transportsJson: string | null,
): AuthenticatorTransportFuture[] | undefined {
  if (!transportsJson) return undefined;

  try {
    const parsed = JSON.parse(transportsJson);
    if (!Array.isArray(parsed)) return undefined;
    return parsed.filter((value): value is AuthenticatorTransportFuture => typeof value === "string");
  } catch {
    return undefined;
  }
}

async function signSessionToken(env: AuthEnv, claims: SessionClaims): Promise<string> {
  return await new SignJWT({ tv: claims.tv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSessionSecret(env));
}

async function verifySessionToken(
  env: AuthEnv,
  token: string,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(env), {
      algorithms: ["HS256"],
    });

    if (typeof payload.sub !== "string" || typeof payload.tv !== "number") {
      return null;
    }

    return {
      sub: payload.sub,
      tv: payload.tv,
    };
  } catch {
    return null;
  }
}

export function isAllowedInstitutionEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith("@pgcc.edu") || normalized.endsWith("@students.pgcc.edu");
}

export async function createPasskeyOptions(
  cookies: Cookies,
  d1: D1Database,
  env: AuthEnv,
  requestUrl: URL,
  emailInput: string,
): Promise<PasskeyOptionsResult> {
  const email = normalizeInstitutionEmail(emailInput);
  const db = getDb(d1);

  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const existingCredentials = existingUser
    ? await db
        .select()
        .from(passkeyCredentials)
        .where(eq(passkeyCredentials.userId, existingUser.id))
    : [];

  if (existingUser && existingCredentials.length > 0) {
    const options = await generateAuthenticationOptions({
      rpID: getRpId(env, requestUrl),
      userVerification: "preferred",
      allowCredentials: existingCredentials.map((credential) => ({
        id: credential.credentialId,
        transports: parseTransports(credential.transports) ?? [],
      })),
    });

    setAuthFlowState(cookies, {
      challenge: options.challenge,
      type: "login",
      userId: existingUser.id,
      email,
    });

    return {
      mode: "login",
      options,
    };
  }

  const pendingUserId = existingUser?.id ?? crypto.randomUUID();
  const options = await generateRegistrationOptions({
    rpID: getRpId(env, requestUrl),
    rpName: getRpName(env),
    userName: email,
    userDisplayName: email.split("@")[0],
    userID: new TextEncoder().encode(pendingUserId),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    excludeCredentials: existingCredentials.map((credential) => ({
      id: credential.credentialId,
      transports: parseTransports(credential.transports) ?? [],
    })),
  });

  setAuthFlowState(cookies, {
    challenge: options.challenge,
    type: "register",
    userId: pendingUserId,
    email,
  });

  return {
    mode: "register",
    options,
  };
}

async function issueSessionForUser(cookies: Cookies, env: AuthEnv, user: User): Promise<void> {
  const token = await signSessionToken(env, {
    sub: user.id,
    tv: user.tokenVersion,
  });

  cookies.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function verifyPasskey(
  cookies: Cookies,
  d1: D1Database,
  env: AuthEnv,
  requestUrl: URL,
  mode: "register" | "login",
  response: RegistrationResponseJSON | AuthenticationResponseJSON,
): Promise<User | null> {
  const flow = parseAuthFlowCookie(cookies);
  clearAuthFlowState(cookies);

  if (!flow || flow.type !== mode) {
    return null;
  }

  const db = getDb(d1);

  if (mode === "register") {
    const verification = await verifyRegistrationResponse({
      response: response as RegistrationResponseJSON,
      expectedChallenge: flow.challenge,
      expectedOrigin: getExpectedOrigin(env, requestUrl),
      expectedRPID: getRpId(env, requestUrl),
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return null;
    }

    const credentialId = verification.registrationInfo.credential.id;
    const publicKey = bytesToBase64url(verification.registrationInfo.credential.publicKey);
    const counter = verification.registrationInfo.credential.counter;
    const transports = JSON.stringify(
      Array.isArray((response as RegistrationResponseJSON).response.transports)
        ? (response as RegistrationResponseJSON).response.transports
        : [],
    );

    const [credentialOwner] = await db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.credentialId, credentialId))
      .limit(1);

    if (credentialOwner) {
      return null;
    }

    const [existingUser] = await db.select().from(users).where(eq(users.email, flow.email)).limit(1);

    let user = existingUser;
    if (!user) {
      const id = flow.userId;
      const name = flow.email.split("@")[0];

      await db.insert(users).values({
        id,
        email: flow.email,
        name,
      });

      const [createdUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!createdUser) {
        return null;
      }
      user = createdUser;
    }

    await db.insert(passkeyCredentials).values({
      id: crypto.randomUUID(),
      userId: user.id,
      credentialId,
      publicKey,
      counter,
      transports,
      backedUp: verification.registrationInfo.credentialBackedUp,
    });

    await issueSessionForUser(cookies, env, user);
    return user;
  }

  const [credential] = await db
    .select()
    .from(passkeyCredentials)
    .where(
      and(
        eq(passkeyCredentials.userId, flow.userId),
        eq(
          passkeyCredentials.credentialId,
          (response as AuthenticationResponseJSON).id,
        ),
      ),
    )
    .limit(1);

  if (!credential) {
    return null;
  }

  const verification = await verifyAuthenticationResponse({
    response: response as AuthenticationResponseJSON,
    expectedChallenge: flow.challenge,
    expectedOrigin: getExpectedOrigin(env, requestUrl),
    expectedRPID: getRpId(env, requestUrl),
    credential: {
      id: credential.credentialId,
      publicKey: base64urlToBytes(credential.publicKey) as Uint8Array<ArrayBuffer>,
      counter: credential.counter,
      transports: parseTransports(credential.transports),
    },
    requireUserVerification: true,
  });

  if (!verification.verified) {
    return null;
  }

  await db
    .update(passkeyCredentials)
    .set({
      counter: verification.authenticationInfo.newCounter,
      backedUp: verification.authenticationInfo.credentialBackedUp,
    })
    .where(eq(passkeyCredentials.id, credential.id));

  const [user] = await db.select().from(users).where(eq(users.id, flow.userId)).limit(1);
  if (!user) {
    return null;
  }

  await issueSessionForUser(cookies, env, user);
  return user;
}

export function deleteSessionCookie(cookies: Cookies): void {
  cookies.delete(SESSION_COOKIE, { path: "/" });
}

export async function revokeUserSessions(
  d1: D1Database,
  userId: string,
): Promise<void> {
  const db = getDb(d1);
  await db
    .update(users)
    .set({
      tokenVersion: sql`${users.tokenVersion} + 1`,
    })
    .where(eq(users.id, userId));
}

export function getSessionCookie(cookies: Cookies): string | undefined {
  return cookies.get(SESSION_COOKIE);
}

export async function validateSession(
  cookies: Cookies,
  d1: D1Database,
  env: AuthEnv,
): Promise<{ user: User } | null> {
  const token = getSessionCookie(cookies);
  if (!token) return null;

  const claims = await verifySessionToken(env, token);
  if (!claims) return null;

  const db = getDb(d1);
  const [user] = await db.select().from(users).where(eq(users.id, claims.sub)).limit(1);

  if (!user || user.tokenVersion !== claims.tv) {
    return null;
  }

  return { user };
}
