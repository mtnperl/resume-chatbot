"use client";
import { useState } from "react";

type RoleFitResult = {
  score: number;
  summary: string;
  matches: string[];
  gaps: string[];
  talkingPoints: string[];
  suggestedQuestion: string;
  verdict: string;
};

function verdictColor(verdict: string) {
  if (verdict === "STRONG FIT") return "#22c55e";
  if (verdict === "GOOD FIT") return "#84cc16";
  if (verdict === "WORTH EXPLORING") return "#f59e0b";
  return "#ef4444";
}

function Section({
  label,
  color,
  items,
}: {
  label: string;
  color: string;
  items: string[];
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          color,
          fontSize: 10,
          letterSpacing: "2px",
          marginBottom: 10,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 8,
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          <span style={{ color, marginTop: 2, flexShrink: 0 }}>→</span>
          <span style={{ color: "var(--text-secondary)" }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

export default function RoleFitAnalyzer() {
  const [open, setOpen] = useState(false);
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoleFitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!jd.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/rolefit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: jd }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setResult(null);
    setJd("");
    setError(null);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
        style={{
          border: "1px solid var(--header-btn-border)",
          color: "var(--metal-mid)",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.borderColor = "var(--chip-hover-border)";
          el.style.color = "var(--chrome-shine)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.borderColor = "var(--header-btn-border)";
          el.style.color = "var(--metal-mid)";
        }}
      >
        ◎ Role Fit
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: "var(--modal-overlay)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div
        className="w-full max-w-xl rounded-2xl p-6 shadow-2xl"
        style={{
          background: "var(--modal-bg)",
          border: "1px solid var(--modal-border)",
          boxShadow: "var(--modal-shadow)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p
              className="mb-1 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--accent-glow)" }}
            >
              Role Fit Analyzer
            </p>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--chrome-shine)" }}
            >
              {result ? "Fit Report" : "Paste a Job Description"}
            </h2>
          </div>
          <button
            onClick={close}
            className="transition-opacity hover:opacity-60"
            style={{ color: "var(--metal-mid)", fontSize: 20, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {!result ? (
          <>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job description here..."
              rows={8}
              className="w-full text-sm leading-relaxed"
              style={{
                background: "var(--modal-input-bg)",
                border: "1px solid var(--modal-input-border)",
                borderRadius: 12,
                padding: "12px 14px",
                color: "var(--text-primary)",
                outline: "none",
                resize: "vertical",
              }}
            />
            {error && (
              <p className="mt-2 text-xs" style={{ color: "#ef4444" }}>
                {error}
              </p>
            )}
            <button
              onClick={analyze}
              disabled={loading || !jd.trim()}
              className="mt-3 w-full rounded-full py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: "var(--send-bg)", boxShadow: "var(--send-shadow)" }}
            >
              {loading ? "Analyzing..." : "Analyze Fit →"}
            </button>
          </>
        ) : (
          <div>
            {/* Score + verdict */}
            <div className="mb-6 text-center">
              <div
                className="text-6xl font-bold leading-none"
                style={{ color: "var(--chrome-shine)" }}
              >
                {result.score}
              </div>
              <div
                className="mb-2 mt-1 text-xs uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}
              >
                Fit Score
              </div>
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                style={{
                  background: verdictColor(result.verdict) + "22",
                  color: verdictColor(result.verdict),
                }}
              >
                {result.verdict}
              </span>
            </div>

            {/* Summary */}
            <p
              className="mb-5 text-sm leading-relaxed"
              style={{
                color: "var(--text-secondary)",
                borderLeft: "2px solid var(--accent-glow)",
                paddingLeft: 14,
              }}
            >
              {result.summary}
            </p>

            <Section label="Matches" color="#22c55e" items={result.matches} />
            <Section label="Gaps" color="#f59e0b" items={result.gaps} />
            <Section
              label="Talking Points for Mathan"
              color="var(--accent-glow)"
              items={result.talkingPoints}
            />

            {/* Suggested question */}
            <div
              className="mt-4 rounded-xl p-4"
              style={{
                background: "var(--modal-input-bg)",
                border: "1px solid var(--modal-input-border)",
              }}
            >
              <p
                className="mb-2 text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--accent-glow)" }}
              >
                Suggested Interview Question
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-primary)" }}
              >
                {result.suggestedQuestion}
              </p>
            </div>

            <button
              onClick={() => {
                setResult(null);
                setJd("");
              }}
              className="mt-4 w-full rounded-full py-2 text-xs font-medium transition-all"
              style={{
                border: "1px solid var(--border-subtle)",
                color: "var(--metal-mid)",
              }}
            >
              Analyze Another Role
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
