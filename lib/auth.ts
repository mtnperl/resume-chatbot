export const SESSION_COOKIE = "mp_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "APP_SESSION_SECRET is not set or too short (need at least 16 chars)",
    );
  }
  return secret;
}

function b64urlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlEncodeString(input: string): string {
  return b64urlEncodeBytes(new TextEncoder().encode(input));
}

function b64urlDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function hmac(secret: string, body: string): Promise<Uint8Array> {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return new Uint8Array(sig);
}

type SessionPayload = {
  iat: number;
  exp: number;
  nonce: string;
};

function randomNonce(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signSession(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
    nonce: randomNonce(),
  };
  const body = b64urlEncodeString(JSON.stringify(payload));
  const mac = await hmac(getSecret(), body);
  return `${body}.${b64urlEncodeBytes(mac)}`;
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [body, mac] = parts;

  let expected: Uint8Array;
  let provided: Uint8Array;
  try {
    expected = await hmac(getSecret(), body);
    provided = b64urlDecode(mac);
  } catch {
    return false;
  }
  if (!constantTimeEqual(expected, provided)) return false;

  try {
    const json = new TextDecoder().decode(b64urlDecode(body));
    const payload = JSON.parse(json) as SessionPayload;
    if (typeof payload.exp !== "number") return false;
    if (Math.floor(Date.now() / 1000) >= payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function checkPassword(input: string | undefined): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected || !input) return false;
  const a = new TextEncoder().encode(input);
  const b = new TextEncoder().encode(expected);
  return constantTimeEqual(a, b);
}
