import "server-only";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(hash);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);
  return toHex(combined);
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const encoder = new TextEncoder();

  // Support both hex (new) and base64 (legacy) encoded hashes
  let combined: Uint8Array;
  if (/^[0-9a-f]+$/i.test(storedHash)) {
    combined = fromHex(storedHash);
  } else {
    // Legacy base64 format
    combined = Uint8Array.from(atob(storedHash), (c) => c.charCodeAt(0));
  }

  const salt = combined.slice(0, 16);
  const originalHash = combined.slice(16);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(hash);

  if (hashArray.length !== originalHash.length) return false;
  // Constant-time comparison to prevent timing attacks
  let mismatch = 0;
  for (let i = 0; i < hashArray.length; i++) {
    mismatch |= hashArray[i] ^ originalHash[i];
  }
  return mismatch === 0;
}
