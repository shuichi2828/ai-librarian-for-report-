import type { OutputLanguage } from "./types";

export function detectLanguage(input: string): "ja" | "en" {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(input) ? "ja" : "en";
}

export function resolveOutputLanguage(input: string, outputLanguage: OutputLanguage): "ja" | "en" {
  if (outputLanguage === "auto") {
    return detectLanguage(input);
  }

  return outputLanguage;
}
