import { describe, it, expect } from "vitest";
import { hashPassword, passwordNeedsRehash, verifyPassword } from "@/server/password";

describe("Password Hashing", () => {
  it("hashes and verifies a password correctly", async () => {
    const password = "securePassword123!";
    const hash = await hashPassword(password);

    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("rejects incorrect passwords", async () => {
    const hash = await hashPassword("correctPassword");
    const isValid = await verifyPassword("wrongPassword", hash);
    expect(isValid).toBe(false);
  });

  it("produces different hashes for the same password (unique salts)", async () => {
    const password = "samePassword";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);

    // Both should still verify
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });

  it("handles empty string password", async () => {
    const hash = await hashPassword("");
    expect(hash).toBeTruthy();

    expect(await verifyPassword("", hash)).toBe(true);
    expect(await verifyPassword("notempty", hash)).toBe(false);
  });

  it("handles long passwords", async () => {
    const longPassword = "a".repeat(1000);
    const hash = await hashPassword(longPassword);
    expect(await verifyPassword(longPassword, hash)).toBe(true);
    expect(await verifyPassword(longPassword + "b", hash)).toBe(false);
  });

  it("handles unicode passwords", async () => {
    const password = "пароль密码パスワード";
    const hash = await hashPassword(password);
    expect(await verifyPassword(password, hash)).toBe(true);
  });

  it("stores a versioned PBKDF2 hash with its work factor", async () => {
    const hash = await hashPassword("test");
    const [algorithm, iterations, salt, derivedHash] = hash.split("$");

    expect(algorithm).toBe("pbkdf2-sha256");
    expect(iterations).toBe("600000");
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(derivedHash).toMatch(/^[0-9a-f]{64}$/);
    expect(passwordNeedsRehash(hash)).toBe(false);
  });

  it.each(["hex", "base64"] as const)(
    "verifies and marks legacy %s hashes for migration",
    async (encoding) => {
      const password = "legacy-password";
      const salt = new Uint8Array(16).fill(7);
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
      );
      const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
        keyMaterial,
        256
      );
      const combined = Buffer.concat([Buffer.from(salt), Buffer.from(bits)]);
      const legacyHash = combined.toString(encoding);

      expect(await verifyPassword(password, legacyHash)).toBe(true);
      expect(passwordNeedsRehash(legacyHash)).toBe(true);
    }
  );

  it("rejects malformed password hashes", async () => {
    expect(await verifyPassword("password", "not-a-valid-hash")).toBe(false);
    expect(passwordNeedsRehash("not-a-valid-hash")).toBe(true);
  });});
