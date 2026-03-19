"use client";
import { useState } from "react";
import timelineData, { type TimelineNode } from "@/data/timelineData";

const ERA_COLORS: Record<string, string> = {
  military:    "#ef4444",
  intelligence: "#f59e0b",
  education:   "#3b82f6",
  tech:        "#22c55e",
};

const ERA_LABELS: Record<string, string> = {
  military:    "Military",
  intelligence: "Intelligence",
  education:   "Education",
  tech:        "Tech / BD",
};

export default function Timeline({
  onSelectPrompt,
}: {
  onSelectPrompt: (prompt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<TimelineNode | null>(null);

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
        ◈ Timeline
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: "var(--modal-overlay)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl"
        style={{
          background: "var(--modal-bg)",
          border: "1px solid var(--modal-border)",
          boxShadow: "var(--modal-shadow)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 pt-6 pb-5"
          style={{ borderBottom: "1px solid var(--modal-input-border)" }}
        >
          <div>
            <p
              className="mb-1 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--accent-glow)" }}
            >
              Career Journey
            </p>
            <h2 className="text-base font-semibold" style={{ color: "var(--chrome-shine)" }}>
              Mathan&apos;s Timeline
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="transition-opacity hover:opacity-60"
            style={{ color: "var(--metal-mid)", fontSize: 20, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 px-6 py-3">
          {Object.entries(ERA_LABELS).map(([era, label]) => (
            <span key={era} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: ERA_COLORS[era] }}
              />
              {label}
            </span>
          ))}
        </div>

        {/* Timeline */}
        <div className="relative px-6 pb-6">
          {/* Vertical spine */}
          <div
            className="absolute top-0 bottom-0 left-10"
            style={{
              width: 1,
              background: "var(--divider-bg)",
            }}
          />

          <div className="space-y-2">
            {timelineData.map((node) => {
              const color = ERA_COLORS[node.era];
              const isActive = active?.id === node.id;

              return (
                <div key={node.id}>
                  {/* Row */}
                  <button
                    className="relative flex w-full items-start gap-4 rounded-xl px-3 py-3 text-left transition-all"
                    style={{
                      background: isActive ? "var(--chip-bg)" : "transparent",
                      border: isActive
                        ? `1px solid ${color}44`
                        : "1px solid transparent",
                    }}
                    onClick={() => setActive(isActive ? null : node)}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "var(--chip-bg)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "transparent";
                      }
                    }}
                  >
                    {/* Dot */}
                    <div className="relative z-10 mt-1 flex shrink-0 items-center justify-center">
                      <div
                        className="h-3 w-3 rounded-full transition-all"
                        style={{
                          background: color,
                          boxShadow: isActive ? `0 0 10px ${color}88` : "none",
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span
                          className="text-xs font-medium tabular-nums"
                          style={{ color }}
                        >
                          {node.year}
                        </span>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "var(--chrome-shine)" }}
                        >
                          {node.title}
                        </span>
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {node.org} · {node.location}
                      </div>
                    </div>

                    {/* Chevron */}
                    <span
                      className="mt-1 shrink-0 text-xs transition-transform"
                      style={{
                        color: "var(--metal-dark)",
                        transform: isActive ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    >
                      ›
                    </span>
                  </button>

                  {/* Expanded detail */}
                  {isActive && (
                    <div
                      className="mx-3 mb-2 rounded-xl px-4 py-3"
                      style={{
                        background: "var(--modal-input-bg)",
                        border: `1px solid ${color}33`,
                        marginLeft: "calc(1rem + 16px)",
                      }}
                    >
                      <p
                        className="mb-3 text-sm leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {node.summary}
                      </p>

                      {/* Tags */}
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {node.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full px-2 py-0.5 text-xs"
                            style={{
                              background: color + "18",
                              color,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Ask button */}
                      <button
                        onClick={() => {
                          onSelectPrompt(node.prompt);
                          setOpen(false);
                        }}
                        className="rounded-full px-4 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90"
                        style={{ background: "var(--send-bg)", boxShadow: "var(--send-shadow)" }}
                      >
                        Ask about this →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
