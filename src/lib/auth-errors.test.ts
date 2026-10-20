import { describe, expect, it } from "vitest";
import { messageForAuth } from "@/lib/auth-errors";

describe("messageForAuth", () => {
  it("translates known codes", () => {
    expect(messageForAuth({ code: "auth/weak-password" })).toMatch(/6 caracteres/);
    expect(messageForAuth({ code: "auth/invalid-credential" })).toMatch(/incorrectos/);
  });

  it("falls back for unknown errors", () => {
    expect(messageForAuth(new Error("x"))).toMatch(/No se pudo entrar/);
  });
});
