"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Suspense } from "react";

type AnalyticsData = {
  total: number;
  avgMessages: number;
  topQuestions: { question: string; count: number }[];
  dailyTraffic: { date: string; count: number }[];
  recentQuestions: { question: string; timestamp: number; messageCount: number }[];
};

function DashboardContent() {
  const params = useSearchParams();
  const key = params.get("key") ?? "";
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!key) {
      setError("Missing ?key= parameter");
      setLoading(false);
      return;
    }
    fetch(`/api/analytics?key=${encodeURIComponent(key)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [key]);

  const labelStyle = { color: "var(--metal-mid)", fontSize: 11 };
  const cardStyle = {
    background: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 16,
    padding: "20px 24px",
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ color: "var(--metal-mid)" }}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm" style={{ color: "var(--metal-mid)" }}>
          {error === "Unauthorized"
            ? "Access denied. Check your key."
            : error}
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      className="min-h-screen px-6 py-10"
      style={{ background: "var(--bg-void)", color: "var(--text-primary)" }}
    >
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--chrome-shine)" }}>
            Analytics
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--metal-mid)" }}>
            Resume chatbot · private
          </p>
        </div>

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: "Total questions", value: data.total.toLocaleString() },
            { label: "Avg messages / session", value: data.avgMessages || "—" },
            { label: "Unique questions tracked", value: data.topQuestions.length },
          ].map(({ label, value }) => (
            <div key={label} style={cardStyle}>
              <p className="mb-1 text-xs uppercase tracking-wider" style={labelStyle}>
                {label}
              </p>
              <p className="text-3xl font-semibold" style={{ color: "var(--chrome-shine)" }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Daily traffic chart */}
        <div className="mb-6" style={cardStyle}>
          <p className="mb-4 text-xs uppercase tracking-wider" style={labelStyle}>
            Daily questions — last 14 days
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.dailyTraffic} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--metal-dark)" }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis tick={{ fontSize: 10, fill: "var(--metal-dark)" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--text-primary)",
                }}
                labelFormatter={(v) => String(v)}
              />
              <Bar dataKey="count" fill="var(--accent-glow)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Top questions */}
          <div style={cardStyle}>
            <p className="mb-4 text-xs uppercase tracking-wider" style={labelStyle}>
              Top questions
            </p>
            <div className="space-y-2">
              {data.topQuestions.slice(0, 10).map(({ question, count }) => (
                <div key={question} className="flex items-start justify-between gap-3">
                  <p
                    className="flex-1 text-xs leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {question}
                  </p>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      background: "var(--chip-bg)",
                      color: "var(--accent-glow)",
                    }}
                  >
                    {count}×
                  </span>
                </div>
              ))}
              {data.topQuestions.length === 0 && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  No data yet.
                </p>
              )}
            </div>
          </div>

          {/* Recent questions */}
          <div style={cardStyle}>
            <p className="mb-4 text-xs uppercase tracking-wider" style={labelStyle}>
              Recent questions
            </p>
            <div className="space-y-3">
              {data.recentQuestions.map(({ question, timestamp, messageCount }, i) => (
                <div key={i} className="border-b pb-2 last:border-b-0" style={{ borderColor: "var(--border-subtle)" }}>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {question}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(timestamp).toLocaleString()}
                    {messageCount != null && ` · msg #${messageCount}`}
                  </p>
                </div>
              ))}
              {data.recentQuestions.length === 0 && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  No data yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
