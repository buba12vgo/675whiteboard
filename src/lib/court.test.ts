import { describe, expect, it } from "vitest";
import { courtInk, isCourtFloor } from "./court.ts";

describe("court floors", () => {
  it("keeps dark ink on light parquet and light ink on a dark floor", () => {
    expect(courtInk("parquet-light", "#1d4e89").line).toBe("#173454");
    expect(courtInk("dark", "#1d4e89").line).toBe("#f4efe4");
    expect(courtInk("flat", "#f6f1e6").line).toBe("#173454");
    expect(courtInk("flat", "#1a2332").line).toBe("#f4efe4");
  });

  it("accepts only the known floors", () => {
    expect(isCourtFloor("parquet-light")).toBe(true);
    expect(isCourtFloor("wood")).toBe(false);
  });
});
