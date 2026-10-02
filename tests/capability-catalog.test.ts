import { describe, expect, it } from "vitest";

import {
  CAPABILITY_SECTIONS,
  CAPABILITY_SPECS,
  capabilityLabel,
} from "@/lib/capability-catalog";

describe("capability catalog", () => {
  it("exposes non-empty sections with specs", () => {
    expect(CAPABILITY_SECTIONS.length).toBeGreaterThan(0);
    for (const section of CAPABILITY_SECTIONS) {
      expect(section.id).toBeTruthy();
      expect(section.title).toBeTruthy();
      expect(section.specs.length).toBeGreaterThan(0);
    }
  });

  it("uses unique act identifiers", () => {
    const acts = CAPABILITY_SPECS.map((spec) => spec.act);
    expect(new Set(acts).size).toBe(acts.length);
  });

  it("labels every spec", () => {
    for (const spec of CAPABILITY_SPECS) {
      expect(spec.act).toBeTruthy();
      expect(spec.label).toBeTruthy();
    }
  });

  it("resolves known acts to human labels", () => {
    expect(capabilityLabel("sshkeys")).toBe("SSH keys");
    expect(capabilityLabel("monitor")).toBe("Live monitoring");
  });

  it("falls back to the act for unknown capabilities", () => {
    expect(capabilityLabel("something-unknown")).toBe("something-unknown");
  });
});
