import type { ProviderPaper } from "./types";

function formatAuthors(authors: string[]): string {
  const cleaned = authors.map((author) => author.trim()).filter(Boolean);

  if (cleaned.length === 0) {
    return "Unknown author";
  }

  if (cleaned.length === 1) {
    return cleaned[0];
  }

  if (cleaned.length <= 20) {
    return `${cleaned.slice(0, -1).join(", ")}, & ${cleaned.at(-1)}`;
  }

  return `${cleaned.slice(0, 19).join(", ")}, ... ${cleaned.at(-1)}`;
}

export function formatApa7(paper: ProviderPaper): string {
  const authors = formatAuthors(paper.authors);
  const year = paper.year ?? "n.d.";
  const source = paper.sourceName ? ` ${paper.sourceName}.` : "";
  const locator = paper.doi ? ` https://doi.org/${paper.doi.replace(/^https?:\/\/doi\.org\//i, "")}` : paper.url ? ` ${paper.url}` : "";

  return `${authors} (${year}). ${paper.title}.${source}${locator}`.replace(/\s+/g, " ").trim();
}
