import { describe, expect, it } from "vitest";
import { analyse } from "../worker/ai";
import { sampleEnquiry } from "../shared/domain";

describe("analysis adapter", () => {
  it("uses an honestly labelled deterministic template without a provider", async () => {
    const result = await analyse(sampleEnquiry, { mode: "template" });
    expect(result.mode).toBe("template");
    expect(result.details).toContain("Requested availability: Friday after 2");
    expect(result.reply).toContain("not a confirmed booking");
  });
  it("validates a real-shaped provider response", async () => {
    const result = await analyse(sampleEnquiry, {
      mode: "live",
      provider: {
        run: async () => ({
          response: JSON.stringify({
            summary: "Customer reports a dripping kitchen tap.",
            service: "Tap repairs",
            details: ["Dripping since Sunday"],
            missing: ["Property access"],
            reply: "Thanks for your enquiry. We will review your request.",
          }),
        }),
      },
    });
    expect(result.mode).toBe("live");
    expect(result.summary).toBe("Customer reports a dripping kitchen tap.");
  });
  it.each([
    { response: "not json" },
    { response: '{"summary":"made up"}' },
    {
      response: JSON.stringify({
        summary: "Tap",
        service: "Tap repairs",
        details: [],
        missing: [],
        reply: "Your appointment is confirmed for Friday.",
      }),
    },
  ])("rejects malformed or unsafe output", async (response) => {
    await expect(
      analyse(sampleEnquiry, {
        mode: "live",
        provider: { run: async () => response },
      }),
    ).rejects.toThrow();
  });
  it("reports missing configuration and provider quota failures", async () => {
    await expect(analyse(sampleEnquiry, { mode: "live" })).rejects.toThrow(
      "not connected",
    );
    await expect(
      analyse(sampleEnquiry, {
        mode: "live",
        provider: {
          run: async () => {
            throw new Error("quota");
          },
        },
      }),
    ).rejects.toThrow("unavailable");
  });
  it("bounds waiting time", async () => {
    await expect(
      analyse(sampleEnquiry, {
        mode: "live",
        timeoutMs: 10,
        provider: { run: () => new Promise(() => {}) },
      }),
    ).rejects.toThrow("timed out");
  });
});
