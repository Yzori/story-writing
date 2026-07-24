import "server-only";

const PASSWORD_ALGORITHM = "pbkdf2-sha256";
const PASSWORD_ITERATIONS = 600_000;
const LEGACY_PASSWORD_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const MAX_ACCEPTED_ITERATIONS = 1_000_000;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

async function derivePasswordHash(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    HASH_BYTES * 8
  );
  return new Uint8Array(hash);
}

type ParsedPasswordHash = {
  iterations: number;
  salt: Uint8Array<ArrayBuffer>;
  hash: Uint8Array;
  versioned: boolean;
};

function parseStoredHash(storedHash: string): ParsedPasswordHash | null {
  const parts = storedHash.split("$");
  if (parts.length === 4) {
    const [algorithm, rawIterations, saltHex, hashHex] = parts;
    const iterations = Number.parseInt(rawIterations, 10);
    const salt = fromHex(saltHex);
    const hash = fromHex(hashHex);

    if (
      algorithm !== PASSWORD_ALGORITHM ||
      !Number.isInteger(iterations) ||
      iterations <= 0 ||
      iterations > MAX_ACCEPTED_ITERATIONS ||
      salt?.length !== SALT_BYTES ||
      hash?.length !== HASH_BYTES
    ) {
      return null;
    }

    return { iterations, salt, hash, versioned: true };
  }

  try {
    const combined = /^[0-9a-f]+$/i.test(storedHash)
      ? fromHex(storedHash)
      : Uint8Array.from(atob(storedHash), (character) => character.charCodeAt(0));

    if (!combined || combined.length !== SALT_BYTES + HASH_BYTES) return null;
    return {
      iterations: LEGACY_PASSWORD_ITERATIONS,
      salt: combined.slice(0, SALT_BYTES),
      hash: combined.slice(SALT_BYTES),
      versioned: false,
    };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derivePasswordHash(password, salt, PASSWORD_ITERATIONS);
  return `${PASSWORD_ALGORITHM}$${PASSWORD_ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
}

export function passwordNeedsRehash(storedHash: string): boolean {
  const parsed = parseStoredHash(storedHash);
  return (
    !parsed ||
    !parsed.versioned ||
    parsed.iterations < PASSWORD_ITERATIONS
  );
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parsed = parseStoredHash(storedHash);
  if (!parsed) return false;

  try {
    const candidate = await derivePasswordHash(
      password,
      parsed.salt,
      parsed.iterations
    );
    if (candidate.length !== parsed.hash.length) return false;

    let mismatch = 0;
    for (let i = 0; i < candidate.length; i += 1) {
      mismatch |= candidate[i] ^ parsed.hash[i];
    }
    return mismatch === 0;
  } catch {
    return false;
  }
}