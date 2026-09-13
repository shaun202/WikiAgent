"use client";

import { useCallback, useState } from "react";
import { CopilotChat, useConfigureSuggestions } from "@copilotkit/react-core/v2";
import { GenerativeUI } from "@/components/generative-ui";
import { AppControl } from "@/components/app-control";
import { findWikiPage, wikiPages } from "@/lib/wiki";

export default function Home() {
  const [selectedId, setSelectedId] = useState<string>(wikiPages[0].id);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const page = findWikiPage(selectedId);
  const selectPage = useCallback((id: string) => setSelectedId(findWikiPage(id).id), []);

  useConfigureSuggestions({
    suggestions: [
      { title: "Summarize this article", message: "Summarize the selected wiki article and cite its page ID." },
      { title: "Find the right policy", message: "Search the Northstar wiki: what policy applies to my question? Show your sources." },
    ],
    available: "before-first-message",
  }, []);

  return (
    <>
      <GenerativeUI />
      <AppControl selectedId={selectedId} selectPage={selectPage} />
      <main className="ck-workspace">
        <header className="ck-workspace-header">
          <div>
            <p className="ck-eyebrow">Agents, everywhere · Northstar knowledge desk</p>
            <h1>WikiAgent</h1>
            <p className="ck-intro">A librarian for the pages your team already trusts.</p>
          </div>
          <div className="ck-header-actions">
            <span className="ck-tag">Demo wiki · RAG</span>
            <button
              type="button"
              className={`ck-agent-toggle${assistantOpen ? " is-open" : ""}`}
              aria-label={assistantOpen ? "Close WikiAgent" : "Open WikiAgent"}
              aria-expanded={assistantOpen}
              title={assistantOpen ? "Close WikiAgent" : "Open WikiAgent"}
              onClick={() => setAssistantOpen((open) => !open)}
            >
              <span aria-hidden="true">✦</span>
            </button>
          </div>
        </header>
        <div className={`ck-reading-layout${assistantOpen ? " is-assistant-open" : ""}`}>
          <section className="ck-panel ck-article-panel" aria-labelledby="wiki-title">
            <div className="ck-incident-picker">
              <label htmlFor="wiki-select">Article</label>
              <select id="wiki-select" value={selectedId} onChange={(event) => selectPage(event.target.value)}>
                {wikiPages.map((item) => <option key={item.id} value={item.id}>{item.section} · {item.title}</option>)}
              </select>
            </div>
            <div className="ck-detail">
              <span className="ck-status-label">{page.section} · Updated {page.updated}</span>
              <h2 id="wiki-title">{page.title}</h2>
              <p>{page.summary}</p>
              <details className="ck-more" open key={page.id}>
                <summary>Read article</summary>
                <dl className="ck-detail-facts ck-detail-facts--two">
                  <div><dt>Article ID</dt><dd>{page.id}</dd></div>
                  <div><dt>Owner</dt><dd>{page.owner}</dd></div>
                </dl>
                <p className="ck-article">{page.content}</p>
              </details>
            </div>
          </section>
          {assistantOpen && <section className="ck-panel ck-assistant" aria-labelledby="assistant-title">
            <header className="ck-assistant-header">
              <h2 id="assistant-title">Ask WikiAgent</h2>
              <p>Retrieve the right pages, then get a cited answer.</p>
            </header>
            <CopilotChat className="ck-chat" labels={{ welcomeMessageText: "Which page should we open?", chatInputPlaceholder: "Ask a question about the Northstar wiki…" }} />
          </section>}
        </div>
      </main>
    </>
  );
}
