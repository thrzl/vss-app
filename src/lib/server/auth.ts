import { SignJWT, jwtVerify } from "jose";
import {
  generateTOTP,
  verifyTOTP,
  createTOTPKeyURI,
} from "@oslojs/otp";
import {
  encodeBase32LowerCaseNoPadding,
  decodeBase32IgnorePadding,
} from "@oslojs/encoding";
import { eq } from "drizzle-orm";
import { getDb } from "$lib/db";
import { users, type User } from "$lib/schema";
import type { Cookies } from "@sveltejs/kit";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSION_COOKIE = "session";
const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;
const JWT_EXPIRY = "7d";
const JWT_ISSUER = "fojo";
const JWT_AUDIENCE = "fojo";

// ---------------------------------------------------------------------------
// JWT secret — derived from an env var, encoded once per isolate lifetime
// ---------------------------------------------------------------------------

let _secret: Uint8Array | null = null;

function getJwtSecret(env: { JWT_SECRET: string }): Uint8Array {
  if (_secret) return _secret;
  _secret = new TextEncoder().encode(env.JWT_SECRET);
  return _secret;
}

// ---------------------------------------------------------------------------
// JWT payload type
// ---------------------------------------------------------------------------

export interface JwtPayload {
  sub: string; // user id
  email: string;
  ver: number; // token version — must match user.tokenVersion
}

// ---------------------------------------------------------------------------
// JWT — create & verify
// ---------------------------------------------------------------------------

export async function createSessionToken(
  user: User,
  env: { JWT_SECRET: string },
): Promise<string> {
  const secret = getJwtSecret(env);
  return new SignJWT({
    sub: user.id,
    email: user.email,
    ver: user.tokenVersion,
  } satisfies JwtPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(JWT_EXPIRY)
    .sign(secret);
}

export async function verifySessionToken(
  token: string,
  env: { JWT_SECRET: string },
): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(env), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    // Ensure the expected claims are present
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.ver !== "number"
    ) {
      return null;
    }
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export function setSessionCookie(cookies: Cookies, token: string): void {
  cookies.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days — matches JWT expiry
  });
}

export function deleteSessionCookie(cookies: Cookies): void {
  cookies.delete(SESSION_COOKIE, { path: "/" });
}

export function getSessionCookie(cookies: Cookies): string | undefined {
  return cookies.get(SESSION_COOKIE);
}

// ---------------------------------------------------------------------------
// Validate session — verify JWT then check token version against DB
// ---------------------------------------------------------------------------

export async function validateSession(
  cookies: Cookies,
  d1: D1Database,
  env: { JWT_SECRET: string },
): Promise<{ user: User; payload: JwtPayload } | null> {
  const token = getSessionCookie(cookies);
  if (!token) return null;

  const payload = await verifySessionToken(token, env);
  if (!payload) return null;

  const db = getDb(d1);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!user) return null;

  // If the token version doesn't match, the session has been invalidated
  if (user.tokenVersion !== payload.ver) return null;

  return { user, payload };
}

// ---------------------------------------------------------------------------
// Invalidate all sessions (increment token version)
// ---------------------------------------------------------------------------

export async function invalidateAllSessions(
  userId: string,
  d1: D1Database,
): Promise<void> {
  const db = getDb(d1);
  const [user] = await db
    .select({ tokenVersion: users.tokenVersion })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return;

  await db
    .update(users)
    .set({ tokenVersion: user.tokenVersion + 1 })
    .where(eq(users.id, userId));
}

// ---------------------------------------------------------------------------
// TOTP helpers
// ---------------------------------------------------------------------------

/** Generate a random 20-byte TOTP secret and return it as a base32 string. */
export function generateTotpSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

/** Decode a base32-encoded TOTP secret back to bytes. */
function decodeTotpSecret(secret: string): Uint8Array {
  return decodeBase32IgnorePadding(secret);
}

/** Generate the otpauth:// URI for QR code rendering. */
export function getTotpKeyUri(
  email: string,
  secret: string,
): string {
  return createTOTPKeyURI(JWT_ISSUER, email, decodeTotpSecret(secret), TOTP_PERIOD, TOTP_DIGITS);
}

/** Verify a TOTP code against a stored secret. */
export function verifyTotpCode(secret: string, code: string): boolean {
  return verifyTOTP(decodeTotpSecret(secret), TOTP_PERIOD, TOTP_DIGITS, code);
}

/** Generate the current TOTP code (used only for testing / debugging). */
export function generateTotpCode(secret: string): string {
  return generateTOTP(decodeTotpSecret(secret), TOTP_PERIOD, TOTP_DIGITS);
}
