import { describe, expect, it } from "vitest";
import { syncLabel } from "./sync-status.ts";

describe("sync label", () => {
  it("prefers the offline state, then the local iPad, then the account queue", () => {
    expect(syncLabel({ online: false, linked: false, pending: false })).toBe("Sin conexión");
    expect(syncLabel({ online: false, linked: true, pending: true })).toBe("Sin conexión");
    expect(syncLabel({ online: true, linked: false, pending: false })).toBe("En este iPad");
    expect(syncLabel({ online: true, linked: true, pending: true })).toBe("Sincronizando");
    expect(syncLabel({ online: true, linked: true, pending: false })).toBe("En la cuenta");
  });
});
