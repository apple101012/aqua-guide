import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  sendAssistantMessage,
  getRegionDetails,
  resolveRegionQuery,
  resolveRegionCoordinates,
} from "../services/assistant-service";
import {
  languageCatalog,
  getLanguageExperience,
} from "../lib/language-catalog";
import {
  getAssistantLanguage,
  setAssistantLanguage as persistLanguage,
  getActiveLocationContext,
  getLastLocationReference,
  setActiveLocationContext,
  setLastLocationReference,
} from "../lib/common";
import StatusBadge from "../components/StatusBadge";
import LanguageSelector from "../components/LanguageSelector";
import { Icon } from "../components/Icons";

/* ------------------------------------------------------------------ */
/*  Rich text renderer for assistant messages                          */
/* ------------------------------------------------------------------ */

function formatInline(text) {
  const parts = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(<strong key={match.index}>{match[1]}</strong>);
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderRichText(content) {
  const normalized = String(content ?? "").replace(/\r/g, "").trim();
  if (!normalized) return null;

  const lines = normalized.split("\n");
  const blocks = [];
  let paragraphLines = [];
  let listType = "";
  let listItems = [];
  let key = 0;

  function flushParagraph() {
    if (!paragraphLines.length) return;
    blocks.push(
      <p key={key++}>
        {paragraphLines.map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {formatInline(line)}
          </span>
        ))}
      </p>
    );
    paragraphLines = [];
  }

  function flushList() {
    if (!listItems.length || !listType) return;
    const Tag = listType;
    blocks.push(
      <Tag key={key++}>
        {listItems.map((item, i) => (
          <li key={i}>{formatInline(item)}</li>
        ))}
      </Tag>
    );
    listItems = [];
    listType = "";
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);

    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listItems.push(orderedMatch[1]);
      continue;
    }

    if (bulletMatch) {
      flushParagraph();
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listItems.push(bulletMatch[1]);
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
}

/* ------------------------------------------------------------------ */
/*  Build assistant context from region                                */
/* ------------------------------------------------------------------ */

function toAssistantContext(region) {
  if (!region?.name) return null;
  return {
    name: region.name,
    statusLabel: region.statusLabel || "Live guidance",
    utility: region.utility || "General water guidance",
    summaryText: region.summaryText || region.heroDescription || "",
    quickSummary: region.quickSummary || region.oneLiner || "",
    actions: Array.isArray(region.actions)
      ? region.actions.map((a) => ({ title: a.title, description: a.description || "" }))
      : [],
  };
}

/* ------------------------------------------------------------------ */
/*  Resolve region from URL params / storage fallback                  */
/* ------------------------------------------------------------------ */

async function resolveRegionContext(searchParams) {
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (lat && lng) {
    try {
      const payload = await resolveRegionCoordinates({
        lat,
        lng,
        name: searchParams.get("name"),
        country: searchParams.get("country"),
        iso2: searchParams.get("iso2"),
        admin1: searchParams.get("admin1"),
      });
      return payload?.region || null;
    } catch {
      // fall through
    }
  }

  const explicitQuery = searchParams.get("q");
  if (explicitQuery) {
    try {
      const payload = await resolveRegionQuery(explicitQuery);
      setLastLocationReference(payload.reference || { type: "query", value: explicitQuery });
      return payload?.region || null;
    } catch {
      // fall through
    }
  }

  const explicitRegionId = searchParams.get("region");
  if (explicitRegionId) {
    try {
      const payload = await getRegionDetails(explicitRegionId);
      setLastLocationReference(payload.reference || { type: "id", value: explicitRegionId });
      if (payload?.region) return { ...payload.region, tracked: true };
    } catch {
      // fall through
    }
  }

  const activeContext = getActiveLocationContext();
  if (activeContext?.name) return activeContext;

  const lastRef = getLastLocationReference();
  if (lastRef.type === "id") {
    try {
      const payload = await getRegionDetails(lastRef.value);
      if (payload?.region) return { ...payload.region, tracked: true };
    } catch {
      return null;
    }
  }
  if (lastRef.type === "query") {
    try {
      const payload = await resolveRegionQuery(lastRef.value);
      return payload?.region || null;
    } catch {
      return null;
    }
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function AssistantPage() {
  const [searchParams] = useSearchParams();
  const [region, setRegion] = useState(null);
  const [language, setLanguageState] = useState(() => {
    const fromParams = searchParams.get("lang");
    if (fromParams && languageCatalog[fromParams]) {
      persistLanguage(fromParams);
      return fromParams;
    }
    return getAssistantLanguage();
  });
  const [conversation, setConversation] = useState([]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const conversationRef = useRef(null);
  const initializedRef = useRef(false);

  /* ---- Set document title ---- */
  useEffect(() => {
    document.title = "Assistant - Aqua Guide";
  }, []);

  /* ---- Resolve region context on mount ---- */
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function init() {
      const resolved = await resolveRegionContext(searchParams);
      if (resolved?.name) setActiveLocationContext(resolved);
      setRegion(resolved);

      const intro = getLanguageExperience(language, resolved).intro;
      setConversation([{ role: "assistant", content: intro, meta: "Aqua Guide" }]);

      // Prefill question from params
      const prefill = searchParams.get("question");
      if (prefill && inputRef.current) {
        inputRef.current.value = prefill;
      }
    }

    init();
    // language is read from the initial closure only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /* ---- Scroll to bottom on new messages ---- */
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation]);

  /* ---- Language change ---- */
  const handleLanguageChange = useCallback(
    (nextLang) => {
      if (!languageCatalog[nextLang]) return;
      setLanguageState(nextLang);
      persistLanguage(nextLang);

      // Update the intro if the conversation is still just the initial message
      setConversation((prev) => {
        if (prev.length === 1 && prev[0].role === "assistant") {
          return [{ role: "assistant", content: getLanguageExperience(nextLang, region).intro, meta: "Aqua Guide" }];
        }
        return prev;
      });
    },
    [region]
  );

  /* ---- Ask a question ---- */
  const ask = useCallback(
    async (question) => {
      const safeQuestion = String(question ?? "").trim();
      if (!safeQuestion || sending) return;

      setConversation((prev) => [
        ...prev,
        { role: "user", content: safeQuestion },
        { role: "assistant", content: "Working through the safest possible answer for this location...", meta: "Aqua Guide", pending: true },
      ]);
      if (inputRef.current) inputRef.current.value = "";
      setSending(true);

      try {
        const response = await sendAssistantMessage({
          question: safeQuestion,
          language,
          regionId: region?.tracked ? region.id : "",
          locationContext: toAssistantContext(region),
          conversation: conversation.filter((m) => !m.pending),
        });

        setConversation((prev) => [
          ...prev.slice(0, -1), // remove pending message
          { role: "assistant", content: response.text, meta: response.meta || "Aqua Guide" },
        ]);
      } catch (err) {
        setConversation((prev) => [
          ...prev.slice(0, -1),
          {
            role: "assistant",
            content: "I could not reach the live assistant right now, but you can still use the region guidance and safety actions on the country page.",
            meta: err instanceof Error ? err.message : "Aqua Guide",
          },
        ]);
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [sending, language, region, conversation]
  );

  const handleSend = useCallback(() => {
    if (inputRef.current) ask(inputRef.current.value);
  }, [ask]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") ask(inputRef.current?.value || "");
    },
    [ask]
  );

  /* ---- Derived data ---- */
  const experience = getLanguageExperience(language, region);

  return (
    <div className="page-shell">
      <section className="assistant-page">
        <div className="assistant-main">
          {/* Header */}
          <div className="section-head compact">
            <div>
              <p className="section-label">Ask Aqua</p>
              <h1>AI water safety assistant</h1>
            </div>
            <p className="section-meta">
              Responses stay grounded in the selected location, with language-specific examples for practical follow-up.
            </p>
          </div>

          {/* Language selector */}
          <div className="language-row">
            <LanguageSelector
              activeLanguage={language}
              onChange={handleLanguageChange}
            />
          </div>

          {/* Context line */}
          <p className="assistant-context">
            {region
              ? `Currently viewing safety guidance for ${region.name}.`
              : "No place selected. Ask a general safe-water question."}
          </p>

          {/* Language preview card */}
          <div className="assistant-language-preview-card">
            <div className="assistant-preview-copy">
              <p className="eyebrow">Language preview</p>
              <h3>{experience.label} sample</h3>
              <p>
                Switching language updates the sample prompt and future replies
                without losing the current place context.
              </p>
            </div>
            <div className="assistant-preview-example">
              <div className="assistant-preview-question">
                <span>Sample prompt</span>
                <strong>{experience.sampleQuestion}</strong>
              </div>
              <div className="message assistant preview-only">
                <div className="message-bubble assistant-rich-text">
                  {renderRichText(experience.sampleAnswer)}
                </div>
                <div className="message-meta">Aqua Guide</div>
              </div>
              <button
                className="secondary-button"
                type="button"
                disabled={sending}
                onClick={() => ask(experience.sampleQuestion)}
              >
                Use this example
              </button>
            </div>
          </div>

          {/* Suggestion chips */}
          <div className="helper-row">
            {experience.suggestions.map((q) => (
              <button
                key={q}
                className="helper-chip"
                type="button"
                disabled={sending}
                onClick={() => {
                  if (inputRef.current) inputRef.current.value = q;
                  ask(q);
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat card */}
          <div className="assistant-chat-card">
            <div className="conversation" ref={conversationRef}>
              {conversation.map((msg, i) => (
                <div key={i} className={`message ${msg.role}`}>
                  <div className={`message-bubble${msg.role === "assistant" ? " assistant-rich-text" : ""}`}>
                    {msg.role === "assistant" ? renderRichText(msg.content) : msg.content}
                  </div>
                  {msg.role === "assistant" && (
                    <div className="message-meta">{msg.meta || "Aqua Guide"}</div>
                  )}
                </div>
              ))}
            </div>
            <div className="input-bar-sticky">
              <div className="assistant-input-row">
                <input
                  ref={inputRef}
                  className="assistant-input"
                  type="text"
                  placeholder={experience.placeholder}
                  disabled={sending}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className="primary-button icon-button"
                  type="button"
                  aria-label="Send question"
                  disabled={sending}
                  onClick={handleSend}
                >
                  <Icon name="spark" />
                </button>
              </div>
              <p className="assistant-footnote">
                Selected language: {experience.label}
              </p>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <aside className="assistant-side">
          {region && (
            <div className="side-status-card">
              <p className="eyebrow">Current place</p>
              <h2>{region.flag || "\u{1F30D}"} {region.name}</h2>
              {region.status && (
                <StatusBadge status={region.status} statusLabel={region.statusLabel} />
              )}
              <div className="side-status-grid">
                <div>
                  <span>Quality index</span>
                  <strong>{region.qualityIndex || "Live"}</strong>
                </div>
                <div>
                  <span>Updated</span>
                  <strong>{region?.metrics?.updated || "Current context"}</strong>
                </div>
              </div>
            </div>
          )}
          <div className="side-card">
            <p className="eyebrow">Practical and shareable</p>
            <h3>The assistant keeps answers short, practical, and safe to share -- whether you're a local resident or visiting the area.</h3>
          </div>
        </aside>
      </section>
    </div>
  );
}
