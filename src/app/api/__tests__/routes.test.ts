import { describe, expect, it } from "vitest";
import { POST as questionPost } from "@/app/api/librarian-questions/route";
import { POST as personalizationPost } from "@/app/api/personalization-check/route";
import { POST as draftPost } from "@/app/api/report-draft/route";
import { POST as revisionPost } from "@/app/api/report-revision/route";
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

  it("rejects invalid draft requests", async () => {
    const response = await draftPost(new Request("http://localhost/api/report-draft", {
      method: "POST",
      body: JSON.stringify({ plan: { id: "bad" }, outputLanguage: "ja" })
    }));

    expect(response.status).toBe(400);
  });

  it("rejects invalid personalization check requests", async () => {
    const response = await personalizationPost(new Request("http://localhost/api/personalization-check", {
      method: "POST",
      body: JSON.stringify({ draft: { title: "bad" }, outputLanguage: "ja" })
    }));

    expect(response.status).toBe(400);
  });

  it("rejects invalid revision requests", async () => {
    const response = await revisionPost(new Request("http://localhost/api/report-revision", {
      method: "POST",
      body: JSON.stringify({ draft: { title: "bad" }, outputLanguage: "ja" })
    }));

    expect(response.status).toBe(400);
  });
});
