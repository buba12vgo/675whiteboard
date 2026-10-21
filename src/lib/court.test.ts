import { describe, expect, it } from "vitest";
import { CENTER_RADIUS } from "./geometry.ts";
import { CENTER_LOGO_OPACITY, centerLogoMeters, courtInk, isCourtFloor, resolveFloorSetting } from "./court.ts";

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

  it("fits the center logo inside the 1.80 m circle", () => {
    const side = centerLogoMeters();
    const halfDiagonal = (side / 2) * Math.SQRT2;
    expect(halfDiagonal).toBeLessThan(CENTER_RADIUS - 0.05);
    expect(side).toBeGreaterThan(CENTER_RADIUS);
    expect(CENTER_LOGO_OPACITY).toBeGreaterThanOrEqual(0.25);
    expect(CENTER_LOGO_OPACITY).toBeLessThanOrEqual(0.35);
  });

  it("accepts only the known floors", () => {
    expect(isCourtFloor("parquet-light")).toBe(true);
    expect(isCourtFloor("wood")).toBe(false);
  });
});
