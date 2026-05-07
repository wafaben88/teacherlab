import { describe, it, expect } from "vitest";
import { fr } from "../lib/locales/fr";
import { en } from "../lib/locales/en";
import { ar } from "../lib/locales/ar";

function flatten(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") {
      keys.push(...flatten(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

describe("i18n locales", () => {
  it("fr, en, ar all expose the same set of keys", () => {
    const fk = flatten(fr).sort();
    const ek = flatten(en).sort();
    const ak = flatten(ar).sort();
    expect(ek).toEqual(fk);
    expect(ak).toEqual(fk);
  });

  it("fr has at least 50 keys (sanity check)", () => {
    expect(flatten(fr).length).toBeGreaterThanOrEqual(50);
  });
});
