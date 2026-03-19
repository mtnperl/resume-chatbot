"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type SessionMessage = { role: string; content: string; timestamp: number };
type Session = {
  sessionId: string;
  persona: string;
  startedAt: number;
  lastActiveAt?: number;
  referrer: string | null;
  userAgent: string | null;
  messages: SessionMessage[];
  active: boolean;
};

type DashboardData = {
  totalSessions: number;
  sessions: Session[];
  personaStats: {
    recruiter: number;
    friend: number;
    luke: number;
    chris: number;
  };
  totalMessages: number;
  recentQuestions: string[];
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key") ?? "";
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!key) return;
    fetch(`/api/analytics?key=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load analytics"));
  }, [key]);

  if (!key) {
    return (
      <div style={{ padding: 40, fontFamily: "monospace", color: "#555" }}>
        Missing ?key= param
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: "monospace", color: "#c00" }}>
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 40, fontFamily: "monospace", color: "#555" }}>
        Loading…
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        fontFamily: "'Inter', sans-serif",
        padding: "32px 24px",
      }}
    >
      <h1
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#111",
          marginBottom: 24,
          letterSpacing: "-0.3px",
        }}
      >
        Mathan's Chatbot Dashboard
      </h1>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 28,
        }}
      >
        {[
          { label: "RECRUITER SESSIONS", value: data.totalSessions },
          { label: "TOTAL MESSAGES", value: data.totalMessages },
          { label: "PERSONA: RECRUITER", value: data.personaStats.recruiter ?? 0 },
          { label: "PERSONA: FRIEND", value: data.personaStats.friend ?? 0 },
          { label: "PERSONA: LUKE", value: data.personaStats.luke ?? 0 },
          { label: "PERSONA: CHRIS", value: data.personaStats.chris ?? 0 },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "#fff",
              border: "1px solid #e5e5e5",
              borderRadius: 10,
              padding: "16px 18px",
            }}
          >
            <div
              style={{ fontSize: 10, fontWeight: 600, color: "#888", letterSpacing: "0.6px", marginBottom: 6 }}
            >
              {stat.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#111" }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Sessions + Transcript */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Session list */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e5e5e5",
              fontSize: 11,
              fontWeight: 600,
              color: "#888",
              letterSpacing: "0.6px",
            }}
          >
            RECRUITER SESSIONS
          </div>
          {data.sessions.length === 0 ? (
            <div style={{ padding: 16, color: "#aaa", fontSize: 13 }}>
              No sessions yet
            </div>
          ) : (
            data.sessions.map((s) => (
              <button
                key={s.sessionId}
                onClick={() => setSelectedSession(s)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 16px",
                  borderBottom: "1px solid #f0f0f0",
                  background: selectedSession?.sessionId === s.sessionId ? "#f7f7f8" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  borderLeft: selectedSession?.sessionId === s.sessionId ? "3px solid #111" : "3px solid transparent",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>
                  {new Date(s.startedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  {s.messages.length} messages
                  {s.referrer ? ` · ${new URL(s.referrer).hostname}` : ""}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Transcript viewer */}
        <div
          style={{
            flex: 1,
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: 10,
            overflow: "hidden",
            minHeight: 300,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e5e5e5",
              fontSize: 11,
              fontWeight: 600,
              color: "#888",
              letterSpacing: "0.6px",
            }}
          >
            TRANSCRIPT
          </div>
          {!selectedSession ? (
            <div style={{ padding: 24, color: "#aaa", fontSize: 13 }}>
              Select a session to view transcript
            </div>
          ) : selectedSession.messages.length === 0 ? (
            <div style={{ padding: 24, color: "#aaa", fontSize: 13 }}>
              No messages in this session
            </div>
          ) : (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {selectedSession.messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    borderLeft: `3px solid ${msg.role === "user" ? "#111" : "#ccc"}`,
                    paddingLeft: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: msg.role === "user" ? "#111" : "#888",
                      letterSpacing: "0.5px",
                      marginBottom: 4,
                    }}
                  >
                    {msg.role === "user" ? "RECRUITER" : "MATHAN.AI"}
                  </div>
                  <div style={{ fontSize: 13, color: "#333", lineHeight: 1.5 }}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent questions */}
      {data.recentQuestions.length > 0 && (
        <div
          style={{
            marginTop: 16,
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e5e5e5",
              fontSize: 11,
              fontWeight: 600,
              color: "#888",
              letterSpacing: "0.6px",
            }}
          >
            RECENT RECRUITER QUESTIONS
          </div>
          <div style={{ padding: "12px 16px" }}>
            {data.recentQuestions.map((q, i) => (
              <div
                key={i}
                style={{
                  fontSize: 13,
                  color: "#333",
                  padding: "6px 0",
                  borderBottom: i < data.recentQuestions.length - 1 ? "1px solid #f5f5f5" : "none",
                  display: "flex",
                  gap: 10,
                }}
              >
                <span style={{ color: "#aaa", minWidth: 20, fontVariantNumeric: "tabular-nums" }}>
                  {i + 1}.
                </span>
                <span>{q}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading…</div>}>
      <DashboardContent />
    </Suspense>
  );
}
