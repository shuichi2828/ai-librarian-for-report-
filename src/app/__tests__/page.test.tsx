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

    expect(screen.getByLabelText("Research topic")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask librarian" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
  });

  it("loads questions and plans from API responses", async () => {
    const user = userEvent.setup();

    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("librarian-questions")) {
        return new Response(
          JSON.stringify({
            questions: [
              {
                id: "purpose",
                type: "choice",
                label: "What should this report prioritize?",
                helpText: "Choose a direction",
                options: ["Background overview", "Solutions"],
                required: true
              },
              {
                id: "detail",
                type: "text",
                label: "What interests you most?",
                helpText: "One sentence",
                options: [],
                required: false
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
    await user.click(screen.getByRole("button", { name: "Ask librarian" }));

    expect(await screen.findByText("What should this report prioritize?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create report plans" }));
    expect(await screen.findByText("Policy angle")).toBeInTheDocument();
  });
});
