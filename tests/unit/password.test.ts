import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const h = await hashPassword("correct horse");
    expect(h).not.toContain("correct horse");
    expect(await verifyPassword("correct horse", h)).toBe(true);
    expect(await verifyPassword("wrong horse", h)).toBe(false);
  });

  it("salts hashes", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });
});
