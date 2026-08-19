import { useState } from "react";
import { useRagQuery } from "../hooks/useRagQuery";
import "./PatientChat.css";

function renderAnswer(answer: string) {
  // Same citation-highlighting approach as PatientJourney.tsx's
  // renderAnswerWithCitations — patient mode still cites [filename p.X]
  // internally (generate.py rule 4); only the on-screen compression differs.
  const parts = answer.split(/(\[[^[\]]+\])/g);
  return parts.map((part, i) => {
    const isCitation = /^\[[^\]]+\]$/.test(part);
    if (!isCitation) return <span key={i}>{part}</span>;
    return (
      <span key={i} className="patient-chat__cite-marker" title="Based on an official clinical guideline">
        [source]
      </span>
    );
  });
}

export function PatientChat() {
  const [question, setQuestion] = useState("");
  const [showSources, setShowSources] = useState(false);
  const { status, data: result, error, ask } = useRagQuery();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || status === "loading") return;

    setShowSources(false);
    await ask(trimmed, "patient");
  }

  return (
    <div className="patient-chat">
      <h3 className="patient-chat__title">Ask a question</h3>
      <p className="patient-chat__hint">
        Ask about preeclampsia or high blood pressure in pregnancy — answers are based only on official
        clinical guidelines, in plain language.
      </p>

      <form className="patient-chat__form" onSubmit={handleSubmit}>
        <input
          className="patient-chat__input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What is preeclampsia?"
          disabled={status === "loading"}
        />
        <button className="patient-chat__submit" type="submit" disabled={status === "loading" || !question.trim()}>
          {status === "loading" ? "Asking…" : "Ask"}
        </button>
      </form>

      {status === "error" && <div className="patient-chat__error">Couldn't reach the assistant — {error}</div>}

      {status === "success" && result && (
        <div className="patient-chat__answer">
          {result.escalation_flag && (
            <div className="patient-chat__escalation" role="alert">
              ⚠ This may require prompt discussion with your healthcare provider.
            </div>
          )}

          <p className={`patient-chat__text${result.refused ? " patient-chat__text--refused" : ""}`}>
            {renderAnswer(result.answer)}
          </p>

          {!result.refused && result.citations.length > 0 && (
            <div className="patient-chat__sources">
              <button className="patient-chat__sources-toggle" onClick={() => setShowSources((v) => !v)}>
                {showSources ? "Hide source" : "Based on an official clinical guideline — see source"}
              </button>
              {showSources && (
                <ul className="patient-chat__sources-list">
                  {result.citations.map((c, i) => (
                    <li key={i}>
                      {c.source} p.{c.page}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
