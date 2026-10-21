import { describe, expect, it } from "vitest";
import { courtInk, isCourtFloor, resolveFloorSetting } from "./court.ts";

describe("court floors", () => {
  it("keeps dark ink on light parquet and light ink on a dark floor", () => {
    expect(courtInk("parquet-light", "#1d4e89").line).toBe("#f7f4ee");
    expect(courtInk("parquet-light", "#1d4e89").lane).toBe("#3b87c9");
    expect(courtInk("parquet-dark", "#1d4e89").lane).toBe("#1e568f");
    expect(courtInk("dark", "#1d4e89").line).toBe("#f4efe4");
    expect(courtInk("light", "#1d4e89").line).toBe("#173454");
    expect(courtInk("flat", "#f6f1e6").line).toBe("#173454");
    expect(courtInk("flat", "#1a2332").line).toBe("#f4efe4");
  });

  it("leaves the old parquet default and opens on a plain light floor", () => {
    expect(resolveFloorSetting({}).floor).toBe("light");
    expect(resolveFloorSetting({ floor: "parquet-light" }).floor).toBe("light");
    expect(resolveFloorSetting({ floor: "parquet-dark" }).floor).toBe("parquet-dark");
    expect(resolveFloorSetting({ floor: "parquet-light", floorVersion: 2 }).floor).toBe("parquet-light");
  });

  it("accepts only the known floors", () => {
    expect(isCourtFloor("parquet-light")).toBe(true);
    expect(isCourtFloor("wood")).toBe(false);
  });
});
