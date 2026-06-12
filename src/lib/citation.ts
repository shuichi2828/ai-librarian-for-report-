import type { CitationStyle, ProviderPaper } from "./types";

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

function formatChicagoAuthors(authors: string[]): string {
  const cleaned = authors.map((author) => author.trim()).filter(Boolean);

  if (cleaned.length === 0) {
    return "Unknown author";
  }

  if (cleaned.length === 1) {
    return cleaned[0];
  }

  if (cleaned.length === 2) {
    return `${cleaned[0]} and ${cleaned[1]}`;
  }

  return `${cleaned.slice(0, -1).join(", ")}, and ${cleaned.at(-1)}`;
}

function firstAuthorName(authors: string[]): string {
  const first = authors.find((author) => author.trim().length > 0)?.trim();
  if (!first) return "Unknown author";
  const parts = first.split(/\s+/);
  return parts.at(-1) ?? first;
}

function shortTitle(title: string): string {
  const cleaned = title.replace(/[.:!?]+$/g, "").trim();
  const words = cleaned.split(/\s+/).slice(0, 6).join(" ");
  return words || cleaned;
}

export function formatApa7(paper: ProviderPaper): string {
  const authors = formatAuthors(paper.authors);
  const year = paper.year ?? "n.d.";
  const source = paper.sourceName ? ` ${paper.sourceName}.` : "";
  const locator = paper.doi ? ` https://doi.org/${paper.doi.replace(/^https?:\/\/doi\.org\//i, "")}` : paper.url ? ` ${paper.url}` : "";

  return `${authors} (${year}). ${paper.title}.${source}${locator}`.replace(/\s+/g, " ").trim();
}

export function formatChicago(paper: ProviderPaper): string {
  const authors = formatChicagoAuthors(paper.authors);
  const year = paper.year ? ` ${paper.year}.` : "";
  const source = paper.sourceName ? ` ${paper.sourceName}.` : "";
  const locator = paper.doi ? ` https://doi.org/${paper.doi.replace(/^https?:\/\/doi\.org\//i, "")}` : paper.url ? ` ${paper.url}` : "";

  return `${authors}. "${paper.title}."${source}${year}${locator}`.replace(/\s+/g, " ").trim();
}

export function formatCitation(paper: ProviderPaper, style: CitationStyle): string {
  return style === "chicago" ? formatChicago(paper) : formatApa7(paper);
}

export function formatInTextCitation(paper: ProviderPaper, style: CitationStyle): string {
  const year = paper.year ?? "n.d.";
  const author = firstAuthorName(paper.authors);

  if (style === "chicago") {
    return `${author}, "${shortTitle(paper.title)}"`;
  }

  return `(${author}, ${year})`;
}
