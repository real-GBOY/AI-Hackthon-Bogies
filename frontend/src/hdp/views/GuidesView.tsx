import "./Views.css";

interface GuideDoc {
  org: string;
  title: string;
  filename: string;
  topic: string;
  blurb: string;
  starterQuestion: string;
}

// The actual indexed corpus (RESEARCH/09_Clinical_Guidelines/) — the same
// three PDFs rag.py retrieves from and generate.py cites by filename. No
// other documents are indexed, so nothing else is listed here.
const GUIDES: GuideDoc[] = [
  {
    org: "ACOG",
    title: "Gestational Hypertension and Preeclampsia",
    filename: "Gestational_Hypertension_and_Preeclampsia_ACOG_Practice_Bulletin,_Number_222_1605448006.pdf",
    topic: "Diagnosis & management",
    blurb: "ACOG Practice Bulletin 222 — the primary US reference for classification, diagnosis and management of hypertensive disorders of pregnancy.",
    starterQuestion: "What does ACOG Practice Bulletin 222 say about the diagnostic criteria for preeclampsia?",
  },
  {
    org: "NICE",
    title: "Hypertension in pregnancy: diagnosis and management",
    filename: "hypertension-in-pregnancy-diagnosis-and-management-pdf-66141717671365.pdf",
    topic: "Monitoring & thresholds",
    blurb: "UK NICE guidance covering assessment intervals, treatment thresholds and monitoring for hypertensive disorders in pregnancy.",
    starterQuestion: "What monitoring does NICE recommend once a patient has gestational hypertension?",
  },
  {
    org: "WHO",
    title: "Recommendations for Prevention and Treatment of Pre-eclampsia and Eclampsia",
    filename: "2011c-who_pe_final_1584190059.pdf",
    topic: "Prevention",
    blurb: "WHO global recommendations on prevention and treatment, including aspirin and calcium supplementation guidance.",
    starterQuestion: "What does WHO recommend for preventing preeclampsia in high-risk patients?",
  },
];

interface GuidesViewProps {
  onAsk: (question: string) => void;
}

export function GuidesView({ onAsk }: GuidesViewProps) {
  return (
    <div className="hdp-page">
      <div className="hdp-page-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <h1 className="hdp-h1">Guidelines library</h1>
          <div className="hdp-subtle">The indexed corpus the assistant retrieves from. Every citation in the product resolves to a document here.</div>
        </div>
      </div>

      <div className="hdp-grid-2">
        {GUIDES.map((g) => (
          <div key={g.filename} className="hdp-panel">
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "oklch(0.42 0.14 285)",
                  background: "oklch(0.96 0.02 285)",
                  border: "1px solid oklch(0.90 0.03 285)",
                  borderRadius: 6,
                  padding: "2px 7px",
                }}
              >
                {g.org}
              </span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 10.5, color: "#a8aeba" }}>{g.topic}</span>
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{g.title}</span>
            <span style={{ fontSize: 12, color: "#8a91a0", lineHeight: 1.5 }}>{g.blurb}</span>
            <span className="mono" style={{ fontSize: 10, color: "#b6bcc7", wordBreak: "break-word" }}>
              {g.filename}
            </span>
            <div>
              <button className="hdp__btn" style={{ fontSize: 11.5, padding: "6px 10px" }} onClick={() => onAsk(g.starterQuestion)}>
                Ask about this
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
