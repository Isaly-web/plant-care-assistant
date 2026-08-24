import { describe, expect, it } from "vitest";
import {
  ISSUE_TYPE_LABELS,
  SEVERITY_LABELS,
  confidencePercentLabel,
  isActionableIssue,
  severityDot,
} from "./plantDiagnosis";

describe("ISSUE_TYPE_LABELS", () => {
  it("has a Swedish label for every issue type", () => {
    expect(ISSUE_TYPE_LABELS.disease).toBe("Sjukdom");
    expect(ISSUE_TYPE_LABELS.pest).toBe("Skadedjur");
    expect(ISSUE_TYPE_LABELS.nutrient_deficiency).toBe("Näringsbrist");
    expect(ISSUE_TYPE_LABELS.environmental).toBe("Miljöorsak");
    expect(ISSUE_TYPE_LABELS.healthy).toBe("Frisk");
    expect(ISSUE_TYPE_LABELS.unknown).toBe("Osäkert");
  });
});

describe("SEVERITY_LABELS", () => {
  it("has a Swedish label for every severity", () => {
    expect(SEVERITY_LABELS.low).toBe("Lindrig");
    expect(SEVERITY_LABELS.medium).toBe("Måttlig");
    expect(SEVERITY_LABELS.high).toBe("Allvarlig");
  });
});

describe("severityDot", () => {
  it("maps severity to the traffic-light convention used elsewhere in the app", () => {
    expect(severityDot("high")).toBe("🔴");
    expect(severityDot("medium")).toBe("🟡");
    expect(severityDot("low")).toBe("🟢");
  });

  it("returns an empty string for null severity", () => {
    expect(severityDot(null)).toBe("");
  });
});

describe("confidencePercentLabel", () => {
  it("rounds to the nearest whole percent", () => {
    expect(confidencePercentLabel(0.953)).toBe("95 % säker");
    expect(confidencePercentLabel(0.601)).toBe("60 % säker");
    expect(confidencePercentLabel(0)).toBe("0 % säker");
  });
});

describe("isActionableIssue", () => {
  it("treats healthy and unknown as non-actionable", () => {
    expect(isActionableIssue("healthy")).toBe(false);
    expect(isActionableIssue("unknown")).toBe(false);
  });

  it("treats disease, pest, nutrient_deficiency and environmental as actionable", () => {
    expect(isActionableIssue("disease")).toBe(true);
    expect(isActionableIssue("pest")).toBe(true);
    expect(isActionableIssue("nutrient_deficiency")).toBe(true);
    expect(isActionableIssue("environmental")).toBe(true);
  });
});
