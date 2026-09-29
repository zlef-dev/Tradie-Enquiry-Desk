import { describe, expect, it } from "vitest";
import {
  enquirySchema,
  sampleEnquiry,
  serviceArea,
  followUpDue,
} from "../shared/domain";

describe("enquiry intake", () => {
  it("requires a phone number when the customer requests text contact", () => {
    expect(
      enquirySchema.safeParse({ ...sampleEnquiry, phone: "" }).success,
    ).toBe(false);
    expect(enquirySchema.safeParse(sampleEnquiry).success).toBe(true);
  });
  it("checks service area exactly and ignores case and surrounding whitespace", () => {
    expect(serviceArea(" carINdale ")).toBe(true);
    expect(serviceArea("Carindale North")).toBe(false);
  });
  it("sets follow-up 48 hours after the workspace clock", () => {
    expect(followUpDue("2026-09-29T04:00:00.000Z")).toBe(
      "2026-10-01T04:00:00.000Z",
    );
  });
});
