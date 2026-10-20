import { describe, expect, it } from "vitest";
import { authDomainForHost } from "@/lib/firebase";

describe("authDomainForHost", () => {
  it("keeps the Firebase domain on localhost", () => {
    expect(authDomainForHost("localhost", "whiteboard675.firebaseapp.com")).toBe("whiteboard675.firebaseapp.com");
  });

  it("uses the public site domain on a phone", () => {
    expect(authDomainForHost("675whiteboard.vercel.app", "whiteboard675.firebaseapp.com")).toBe(
      "675whiteboard.vercel.app",
    );
  });
});
