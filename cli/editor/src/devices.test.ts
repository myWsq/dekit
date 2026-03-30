import { describe, test, expect } from "vitest";
import { DEVICE_PRESETS, calcScale } from "./devices.js";

describe("DEVICE_PRESETS", () => {
  test("has at least 10 presets", () => {
    expect(DEVICE_PRESETS.length).toBeGreaterThanOrEqual(10);
  });

  test("every preset has valid dimensions", () => {
    for (const d of DEVICE_PRESETS) {
      expect(d.name).toBeTruthy();
      expect(d.width).toBeGreaterThan(0);
      expect(d.height).toBeGreaterThan(0);
      expect(d.dpr).toBeGreaterThan(0);
    }
  });

  test("first preset is a phone", () => {
    expect(DEVICE_PRESETS[0].width).toBeLessThan(500);
  });
});

describe("calcScale", () => {
  test("fits a phone into a large canvas", () => {
    const scale = calcScale(393, 852, 800, 600);
    // 800/393 = 2.03, 600/852 = 0.70 → min is 0.70, clamped to ≤1
    expect(scale).toBeCloseTo(0.704, 2);
  });

  test("never scales above 1", () => {
    const scale = calcScale(200, 200, 800, 600);
    expect(scale).toBe(1);
  });

  test("handles equal dimensions", () => {
    const scale = calcScale(800, 600, 800, 600);
    expect(scale).toBe(1);
  });

  test("handles device wider than canvas", () => {
    const scale = calcScale(1920, 1080, 800, 600);
    // 800/1920 = 0.417, 600/1080 = 0.556 → min is 0.417
    expect(scale).toBeCloseTo(0.417, 2);
  });

  test("clamps to minimum 0.1", () => {
    const scale = calcScale(10000, 10000, 100, 100);
    expect(scale).toBe(0.1);
  });
});
