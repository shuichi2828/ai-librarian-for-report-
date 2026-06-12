import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("Home", () => {
  it("renders search controls and language switch", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "AI Report Builder" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Japanese" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
  });

  it("renders app controls after login", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "English" }));
    await user.type(screen.getByLabelText("Name or email address"), "student@example.com");
    await user.click(screen.getByRole("button", { name: "Start" }));

    expect(screen.getByLabelText("Enter your report theme.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to the next screen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
  });

  it("loads questions and plans from API responses", async () => {
    const user = userEvent.setup();

    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("content-points")) {
        return new Response(
          JSON.stringify({
            points: [
              {
                id: "point-1",
                title: "Evidence point",
                description: "Use university AI policy as evidence.",
                type: "evidence",
                keywordsJa: ["大学", "AI"],
                keywordsEn: ["university", "AI"],
                source: "user"
              }
            ],
            outputLanguage: "en",
            usedFallback: false
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("theme-candidates")) {
        return new Response(
          JSON.stringify({
            candidates: [
              {
                id: "angle-1",
                title: "Policy angle",
                researchQuestion: "How should universities respond?",
                keywordsJa: ["大学", "政策"],
                keywordsEn: ["university", "policy"],
                reason: "Clear report path",
                thesisHint: "Universities need a practical response.",
                outline: ["Background", "Problems", "Recommendations", "Limits"],
                paperStrategy: "Search policy and education papers."
              }
            ],
            outputLanguage: "en",
            usedFallback: false
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          references: [
            {
              id: "ref-1",
              title: "AI policy in universities",
              authors: ["A. Sato"],
              year: 2025,
              sourceName: "Education Policy",
              doi: "10.1/test",
              abstractOrMetadataSummary: "Abstract-based summary",
              whyUseful: "Useful for policy framing",
              apa7: "Sato, A. (2025). AI policy in universities. Education Policy. https://doi.org/10.1/test",
              sourceProvider: "OpenAlex",
              verifiedMetadata: true
            }
          ],
          warnings: [],
          alternativeKeywords: [],
          refinementSuggestions: []
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    render(<Home />);
    await user.click(screen.getByRole("button", { name: "English" }));
    await user.type(screen.getByLabelText("Name or email address"), "student@example.com");
    await user.click(screen.getByRole("button", { name: "Start" }));
    await user.click(screen.getByRole("button", { name: "Narrow" }));
    await user.click(screen.getByRole("button", { name: "Create content points" }));

    expect(await screen.findByText("Evidence point")).toBeInTheDocument();
    await user.click(screen.getByLabelText(/Evidence point/));
    await user.click(screen.getByRole("button", { name: "Create plan" }));
    expect(await screen.findByText("Policy angle")).toBeInTheDocument();
  });
});
