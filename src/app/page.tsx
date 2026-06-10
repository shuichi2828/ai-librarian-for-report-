"use client";

import { BookOpen, Clipboard, History, Languages, Library, Loader2, LogOut, MessageSquareText, Search, Trash2, UserRound, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { InterviewAnswer, LibrarianQuestion, OutputLanguage, ReferenceItem, ReferenceSearchResult, ThemeCandidate } from "@/lib/types";

type QuestionsResponse = {
  questions: LibrarianQuestion[];
  outputLanguage: "ja" | "en";
  usedFallback: boolean;
};

type PlansResponse = {
  candidates: ThemeCandidate[];
  outputLanguage: "ja" | "en";
  usedFallback: boolean;
};

type HistoryEntry = {
  id: string;
  topic: string;
  plan: ThemeCandidate;
  answers: InterviewAnswer[];
  references: ReferenceItem[];
  outputLanguage: OutputLanguage;
  createdAt: string;
};

const HISTORY_KEY = "ai-librarian-history-v2";
const USER_KEY = "ai-librarian-user-v1";

type GuestUser = {
  id: string;
  name: string;
};

function languageLabel(language: OutputLanguage) {
  if (language === "ja") return "Japanese";
  if (language === "en") return "English";
  return "Auto";
}

function copyText(reference: ReferenceItem) {
  const url = reference.doi ? `https://doi.org/${reference.doi}` : reference.url;
  return [reference.apa7, reference.abstractOrMetadataSummary, reference.whyUseful, url].filter(Boolean).join("\n");
}

export default function Home() {
  const [user, setUser] = useState<GuestUser | null>(null);
  const [loginName, setLoginName] = useState("");
  const [topic, setTopic] = useState("Generative AI and university education");
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("auto");
  const [questions, setQuestions] = useState<LibrarianQuestion[]>([]);
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({});
  const [plans, setPlans] = useState<ThemeCandidate[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>();
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [refinements, setRefinements] = useState<string[]>([]);
  const [totalReviewed, setTotalReviewed] = useState<number>();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [status, setStatus] = useState<"idle" | "questions" | "plans" | "references">("idle");
  const [error, setError] = useState<string>();

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId), [plans, selectedPlanId]);
  const busy = status !== "idle";
  const userHistoryKey = user ? `${HISTORY_KEY}-${user.id}` : HISTORY_KEY;

  useEffect(() => {
    const savedUser = window.localStorage.getItem(USER_KEY);
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser) as GuestUser;
      setUser(parsedUser);
      setLoginName(parsedUser.name);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const saved = window.localStorage.getItem(`${HISTORY_KEY}-${user.id}`);
    if (saved) {
      setHistory(JSON.parse(saved) as HistoryEntry[]);
    } else {
      setHistory([]);
    }
  }, [user]);

  function persistHistory(nextHistory: HistoryEntry[]) {
    setHistory(nextHistory);
    window.localStorage.setItem(userHistoryKey, JSON.stringify(nextHistory));
  }

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = loginName.trim();

    if (!name) return;

    const nextUser = {
      id: name.toLowerCase().replace(/[^\p{L}\p{N}@._-]+/gu, "-").slice(0, 80),
      name
    };
    setUser(nextUser);
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }

  function logout() {
    setUser(null);
    setHistory([]);
    setQuestions([]);
    setPlans([]);
    setReferences([]);
    setError(undefined);
    window.localStorage.removeItem(USER_KEY);
  }

  function currentAnswers(): InterviewAnswer[] {
    return questions
      .map((question) => ({
        questionId: question.id,
        question: question.label,
        answer: answerMap[question.id]?.trim() ?? ""
      }))
      .filter((item) => item.answer.length > 0);
  }

  async function getQuestions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!topic.trim()) return;

    setStatus("questions");
    setError(undefined);
    setQuestions([]);
    setPlans([]);
    setReferences([]);
    setWarnings([]);
    setAnswerMap({});

    try {
      const response = await fetch("/api/librarian-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, outputLanguage })
      });

      if (!response.ok) throw new Error("questions");

      const result = (await response.json()) as QuestionsResponse;
      setQuestions(result.questions);
      setAnswerMap(
        Object.fromEntries(result.questions.filter((question) => question.type === "choice").map((question) => [question.id, question.options?.[0] ?? ""]))
      );
    } catch {
      setError("Could not prepare librarian questions.");
    } finally {
      setStatus("idle");
    }
  }

  async function getPlans() {
    const missingRequired = questions.some((question) => question.required && !(answerMap[question.id] ?? "").trim());
    if (missingRequired) {
      setError("Please answer the required questions first.");
      return;
    }

    setStatus("plans");
    setError(undefined);
    setPlans([]);
    setReferences([]);
    setWarnings([]);

    try {
      const response = await fetch("/api/theme-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, outputLanguage, answers: currentAnswers() })
      });

      if (!response.ok) throw new Error("plans");

      const result = (await response.json()) as PlansResponse;
      setPlans(result.candidates);
      setSelectedPlanId(result.candidates[0]?.id);
    } catch {
      setError("Could not create report plans.");
    } finally {
      setStatus("idle");
    }
  }

  async function getReferences(plan: ThemeCandidate) {
    setStatus("references");
    setError(undefined);
    setSelectedPlanId(plan.id);
    setReferences([]);
    setWarnings([]);
    setAlternatives([]);
    setRefinements([]);
    setTotalReviewed(undefined);

    try {
      const response = await fetch("/api/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate: plan, outputLanguage, citationStyle: "apa7" })
      });

      if (!response.ok) throw new Error("references");

      const result = (await response.json()) as ReferenceSearchResult;
      setReferences(result.references);
      setWarnings(result.warnings);
      setAlternatives(result.alternativeKeywords);
      setRefinements(result.refinementSuggestions);
      setTotalReviewed(result.totalCandidatesReviewed);

      if (result.references.length > 0) {
        const entry: HistoryEntry = {
          id: `${Date.now()}-${plan.id}`,
          topic,
          plan,
          answers: currentAnswers(),
          references: result.references,
          outputLanguage,
          createdAt: new Date().toISOString()
        };
        persistHistory([entry, ...history.filter((item) => item.id !== entry.id)].slice(0, 12));
      }
    } catch {
      setError("Could not fetch references.");
    } finally {
      setStatus("idle");
    }
  }

  function loadHistory(entry: HistoryEntry) {
    setTopic(entry.topic);
    setOutputLanguage(entry.outputLanguage);
    setQuestions([]);
    setAnswerMap(Object.fromEntries(entry.answers.map((answer) => [answer.questionId, answer.answer])));
    setPlans([entry.plan]);
    setSelectedPlanId(entry.plan.id);
    setReferences(entry.references);
    setWarnings([]);
    setAlternatives([]);
    setRefinements([]);
    setError(undefined);
  }

  if (!user) {
    return (
      <main className="loginShell">
        <section className="loginPanel">
          <div className="brandMark">
            <Library size={22} />
          </div>
          <p className="eyebrow">AI Librarian</p>
          <h1>Report Builder</h1>
          <p className="loginText">Enter your name or email to start. Anyone can use this app; this sign-in only keeps your saved plans separate on this device.</p>
          <form className="loginForm" onSubmit={login}>
            <label htmlFor="loginName">Name or email</label>
            <input id="loginName" value={loginName} onChange={(event) => setLoginName(event.target.value)} placeholder="student@example.com" autoComplete="email" />
            <button className="primaryButton" type="submit">
              <UserRound size={18} />
              Log in
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <aside className="historyPane" aria-label="Search history">
        <div className="paneHeader">
          <div className="brandMark">
            <Library size={20} />
          </div>
          <div>
            <p className="eyebrow">AI Librarian</p>
            <h1>Report Builder</h1>
          </div>
        </div>

        <div className="userBox">
          <UserRound size={17} />
          <span>{user.name}</span>
          <button className="iconButton subtle" type="button" onClick={logout} aria-label="Log out" title="Log out">
            <LogOut size={16} />
          </button>
        </div>

        <div className="historyTitle">
          <History size={17} />
          <span>History</span>
          {history.length > 0 && (
            <button className="iconButton subtle" type="button" onClick={() => persistHistory([])} aria-label="Clear history" title="Clear history">
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div className="historyList">
          {history.length === 0 ? (
            <p className="emptyText">Saved report plans will appear here.</p>
          ) : (
            history.map((entry) => (
              <button className="historyItem" type="button" key={entry.id} onClick={() => loadHistory(entry)}>
                <span>{entry.topic}</span>
                <small>
                  {new Date(entry.createdAt).toLocaleDateString()} / {languageLabel(entry.outputLanguage)}
                </small>
                <X
                  size={15}
                  aria-label="Delete history item"
                  onClick={(event) => {
                    event.stopPropagation();
                    persistHistory(history.filter((item) => item.id !== entry.id));
                  }}
                />
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="workspace">
        <form className="searchBand" onSubmit={getQuestions}>
          <div className="topicField">
            <label htmlFor="topic">Research topic</label>
            <input
              id="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Example: generative AI and university education"
            />
          </div>
          <div className="languageControl" aria-label="Output language">
            <Languages size={18} />
            {(["auto", "ja", "en"] as const).map((language) => (
              <button
                className={outputLanguage === language ? "segmented active" : "segmented"}
                key={language}
                onClick={() => setOutputLanguage(language)}
                type="button"
              >
                {languageLabel(language)}
              </button>
            ))}
          </div>
          <button className="primaryButton" type="submit" disabled={busy}>
            {status === "questions" ? <Loader2 size={18} className="spin" /> : <MessageSquareText size={18} />}
            Ask librarian
          </button>
        </form>

        {error && <div className="notice error">{error}</div>}

        <div className="workflowGrid">
          <section aria-label="Librarian questions">
            <div className="sectionHeader">
              <MessageSquareText size={18} />
              <h2>1. Clarify the idea</h2>
            </div>
            <div className="questionList">
              {questions.length === 0 ? (
                <div className="placeholderBlock">Enter a broad idea. The librarian will ask follow-up questions before creating report plans.</div>
              ) : (
                questions.map((question) => (
                  <label className="questionCard" key={question.id}>
                    <span>{question.label}</span>
                    <small>{question.helpText}</small>
                    {question.type === "choice" ? (
                      <select value={answerMap[question.id] ?? ""} onChange={(event) => setAnswerMap({ ...answerMap, [question.id]: event.target.value })}>
                        {(question.options ?? []).map((option) => (
                          <option value={option} key={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <textarea
                        value={answerMap[question.id] ?? ""}
                        onChange={(event) => setAnswerMap({ ...answerMap, [question.id]: event.target.value })}
                        placeholder="Type your answer"
                        rows={3}
                      />
                    )}
                  </label>
                ))
              )}
            </div>
            {questions.length > 0 && (
              <button className="secondaryButton" type="button" onClick={getPlans} disabled={busy}>
                {status === "plans" ? <Loader2 size={18} className="spin" /> : <BookOpen size={18} />}
                Create report plans
              </button>
            )}
          </section>

          <section aria-label="Report plans">
            <div className="sectionHeader">
              <BookOpen size={18} />
              <h2>2. Choose a report plan</h2>
            </div>
            <div className="angleList">
              {plans.length === 0 ? (
                <div className="placeholderBlock">Plans will appear after the interview.</div>
              ) : (
                plans.map((plan) => (
                  <article className={plan.id === selectedPlanId ? "angleCard selected" : "angleCard"} key={plan.id}>
                    <span>{plan.title}</span>
                    <p>{plan.researchQuestion}</p>
                    <small>{plan.reason}</small>
                    <div className="outline">
                      {plan.outline.map((item) => (
                        <b key={item}>{item}</b>
                      ))}
                    </div>
                    <p className="whyUseful">{plan.thesisHint}</p>
                    <button className="secondaryButton compact" type="button" onClick={() => getReferences(plan)} disabled={status === "references"}>
                      {status === "references" && selectedPlanId === plan.id ? <Loader2 size={17} className="spin" /> : <Search size={17} />}
                      Find papers
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="referencesPane" aria-label="References">
          <div className="sectionHeader">
            <Library size={18} />
            <h2>3. Papers for the plan</h2>
            {selectedPlan && <span className="selectedChip">{selectedPlan.title}</span>}
          </div>

          {status === "references" && (
            <div className="loadingBlock">
              <Loader2 size={24} className="spin" />
              <span>Searching more candidates across academic sources...</span>
            </div>
          )}

          {(warnings.length > 0 || totalReviewed !== undefined) && (
            <div className="notice">
              {totalReviewed !== undefined && <p>Reviewed candidates before ranking: {totalReviewed}</p>}
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
              {alternatives.length > 0 && <p>Keywords: {alternatives.join(", ")}</p>}
              {refinements.length > 0 && <p>{refinements.join(" / ")}</p>}
            </div>
          )}

          <div className="referenceList">
            {references.length === 0 && status !== "references" ? (
              <div className="placeholderBlock">Choose a plan to search verified papers.</div>
            ) : (
              references.map((reference) => (
                <article className="referenceCard" key={reference.id}>
                  <div className="referenceTopline">
                    <span>{reference.sourceProvider}</span>
                    <span>{reference.year ?? "n.d."}</span>
                  </div>
                  <h3>{reference.title}</h3>
                  <p className="authors">{reference.authors.join(", ")}</p>
                  <p>{reference.abstractOrMetadataSummary}</p>
                  <p className="whyUseful">{reference.whyUseful}</p>
                  <div className="citationRow">
                    <code>{reference.apa7}</code>
                    <button className="iconButton" type="button" onClick={() => navigator.clipboard.writeText(copyText(reference))} aria-label="Copy APA citation" title="Copy APA citation">
                      <Clipboard size={16} />
                    </button>
                  </div>
                  <a href={reference.doi ? `https://doi.org/${reference.doi}` : reference.url} target="_blank" rel="noreferrer">
                    Open source
                  </a>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
