import { describe, expect, it } from "vitest";
import { getCampaignErrorMessage } from "@/lib/campaign-api";

describe("getCampaignErrorMessage", () => {
  it("uses nested API error messages", async () => {
    const response = Response.json(
      { error: { message: "Only the GM can update clocks" } },
      { status: 403 },
    );

    await expect(getCampaignErrorMessage(response, "Fallback")).resolves.toBe(
      "Only the GM can update clocks",
    );
  });

  it("falls back when the response body is not JSON", async () => {
    const response = new Response("Nope", { status: 500 });

    await expect(getCampaignErrorMessage(response, "Fallback")).resolves.toBe("Fallback");
  });
});
