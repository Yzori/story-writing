import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/server/password";

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

  it("returns base64-encoded string", async () => {
    const hash = await hashPassword("test");
    // Base64 only contains these characters
    expect(hash).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("hash contains salt + hash (48 bytes = 16 salt + 32 hash)", async () => {
    const hash = await hashPassword("test");
    const decoded = Uint8Array.from(atob(hash), (c) => c.charCodeAt(0));
    expect(decoded.length).toBe(48); // 16-byte salt + 32-byte SHA-256 hash
  });
});
