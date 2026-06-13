# AI Report Builder

A bilingual AI librarian for university report planning. Students enter a broad idea, answer librarian-style follow-up questions, choose from multiple report plans, and receive verified paper candidates with summaries and APA 7 citations.

The app includes open guest login. Anyone can enter a name or email and start using it. This is not identity verification; it only separates saved plan history in the browser.

## Features

- Guest login for public use.
- Assignment/material intake for the prompt, the student's opinion, and must-include points.
- Material Quality Check for strengthening vague inputs before planning. It scores material strength, asks quick follow-up questions, supports report preferences such as personal experience, paper citations, objective facts, and course content, and lets students add suggested material to the planning flow.
- AI-generated content suggestions that the user selects before report plans are created.
- Flexible report-plan refinement. Students can ask for different plans, write what feels almost right, or select multiple plans to mix into a new set of options.
- Optional PDF upload. The app summarizes the PDF and extracts themes that can be selected and folded into report plans.
- OpenAI OCR fallback for scanned/image PDFs.
- PDF-only outline and draft mode. Students can draft from selected PDF themes without choosing external papers; the app labels that no external paper citations are included yet.
- Paper search across OpenAlex, Crossref, Semantic Scholar, and CiNii.
- Relevance-ranked paper candidates with percentage scores.
- Multi-paper selection for building a report outline that incorporates chosen papers and PDF themes.
- Optional report draft generation after choosing a plan and papers, with word count, language level, natural-tone, and custom condition controls.
- Draft writing style control with Standard and Academic modes.
- Personalization check after draft generation. The app suggests selectable revision points, lets the user add "Others" in free text, and creates a revised draft focused on the student's own argument, course context, examples, and evidence use.
- Vercel Analytics for page views and privacy-conscious feature events. Events track counts and settings only, not student names, topic text, PDF text, or paper titles.
- First-use consent for the Terms, Privacy Policy, AI usage guide, and PDF upload policy.
- Legal and safety pages for terms, privacy, AI/plagiarism guidance, PDF upload rules, and the six-month roadmap.

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
5. In Vercel, open the project dashboard and enable Web Analytics to view traffic and custom events.

Never expose `OPENAI_API_KEY` in browser code. This app keeps OpenAI and academic-search calls in server-side API routes. The API routes include a small in-memory rate limit for public MVP use, but a production service should add persistent rate limiting, monitoring, and abuse controls.

Tracked custom events:

- `guest_login`
- `terms_accepted`
- `material_checked`
- `content_points_created`
- `pdf_read`
- `pdf_read_failed`
- `plan_created`
- `references_found`
- `outline_created`
- `draft_created`
- `draft_feedback_submitted`
- `personalization_checked`
- `revision_created`

## Verify

```powershell
npm.cmd test
npm.cmd run build
```
