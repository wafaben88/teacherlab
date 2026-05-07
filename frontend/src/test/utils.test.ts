import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("env is jsdom", () => {
    expect(typeof window).toBe("object");
    expect(typeof document).toBe("object");
  });
});
