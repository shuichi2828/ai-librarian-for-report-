# AI Librarian MVP

A bilingual AI librarian for university report planning. Students enter a broad idea, answer librarian-style follow-up questions, choose from multiple report plans, and receive verified paper candidates with summaries and APA 7 citations.

The app includes open guest login. Anyone can enter a name or email and start using it. This is not identity verification; it only separates saved plan history in the browser.

## Features

- Guest login for public use.
- Librarian-style follow-up questions with an `Other` option and custom text.
- Optional PDF upload. The app summarizes the PDF and extracts themes that can be selected and folded into report plans.
- OpenAI OCR fallback for scanned/image PDFs.
- Paper search across OpenAlex, Crossref, Semantic Scholar, and CiNii.
- Relevance-ranked paper candidates with percentage scores.
- Multi-paper selection for building a report outline that incorporates chosen papers and PDF themes.

## Run

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Set `OPENAI_API_KEY` in `.env.local` to enable AI-generated research angles and reference summaries. Without it, the app uses deterministic fallback angles and metadata-only summaries.

## Public deployment

The easiest public deployment path for this Next.js app is Vercel.

1. Push this folder to a GitHub repository.
2. Create a new Vercel project from that repository.
3. Add these environment variables in Vercel Project Settings:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (optional, defaults to `gpt-5.4-mini`)
   - `OPENAI_OCR_MODEL` (optional, defaults to `OPENAI_MODEL`)
   - `CROSSREF_MAILTO` (recommended)
   - `OPENALEX_API_KEY` (optional)
   - `SEMANTIC_SCHOLAR_API_KEY` (optional)
   - `CINII_APP_ID` (optional)
4. Deploy.

Never expose `OPENAI_API_KEY` in browser code. This app keeps OpenAI and academic-search calls in server-side API routes. The API routes include a small in-memory rate limit for public MVP use, but a production service should add persistent rate limiting, monitoring, and abuse controls.

## Verify

```powershell
npm.cmd test
npm.cmd run build
```
