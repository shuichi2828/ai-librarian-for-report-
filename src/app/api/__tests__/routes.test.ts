import { describe, expect, it } from "vitest";
import { POST as questionPost } from "@/app/api/librarian-questions/route";
import { POST as themePost } from "@/app/api/theme-candidates/route";
import { POST as referencesPost } from "@/app/api/references/route";

describe("API routes", () => {
  it("rejects invalid librarian question requests", async () => {
    const response = await questionPost(new Request("http://localhost/api/librarian-questions", {
      method: "POST",
      body: JSON.stringify({ topic: "", outputLanguage: "ja" })
    }));

    expect(response.status).toBe(400);
  });

  it("rejects invalid topic requests", async () => {
    const response = await themePost(new Request("http://localhost/api/theme-candidates", {
      method: "POST",
      body: JSON.stringify({ topic: "", outputLanguage: "ja" })
    }));

    expect(response.status).toBe(400);
  });

  it("rejects invalid reference requests", async () => {
    const response = await referencesPost(new Request("http://localhost/api/references", {
      method: "POST",
      body: JSON.stringify({ candidate: { id: "bad" }, outputLanguage: "ja" })
    }));

    expect(response.status).toBe(400);
  });
});
