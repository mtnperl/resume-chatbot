"use client";

import { useState, useRef, useEffect, memo, useCallback } from "react";
import type { Anthropic } from "@anthropic-ai/sdk";
import ReactMarkdown from "react-markdown";
import { MAX_MESSAGES } from "@/lib/constants";

type Message = Anthropic.MessageParam & { id: string };

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm here to answer questions about Mathan's background. Ask me anything about his experience, skills, or career history.",
};

const SUGGESTED_QUESTIONS = [
  "What's your current role?",
  "What are your key skills?",
  "Tell me about your experience at Unity",
  "What industries have you worked in?",
  "What's your educational background?",
  "What languages do you speak?",
];

// ── Memoized message bubble ───────────────────────────────────────────────────
const MessageBubble = memo(function MessageBubble({
  message,
  isStreaming,
}: {
  message: Message;
  isStreaming: boolean;
}) {
  const content = message.content as string;
  const isUser = message.role === "user";

  return (
    <div className={`message-bubble flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
        style={
          isUser
            ? {
                background: "linear-gradient(135deg, #1a2035, #151c2e)",
                border: "1px solid rgba(110,181,255,0.2)",
                boxShadow: "0 0 20px rgba(79,142,247,0.08)",
                color: "var(--chrome-shine)",
              }
            : {
                background: "linear-gradient(135deg, #111118, #0e0e16)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderLeft: "2px solid #4f8ef7",
                color: "var(--metal-light)",
              }
        }
      >
        {isUser ? (
          content || <span className="animate-pulse opacity-50">▍</span>
        ) : isStreaming && !content ? (
          <span className="flex items-center gap-1.5">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </span>
        ) : content ? (
          <ReactMarkdown
            components={{
              p:      ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul:     ({ children }) => <ul className="mb-2 list-disc pl-4 last:mb-0">{children}</ul>,
              ol:     ({ children }) => <ol className="mb-2 list-decimal pl-4 last:mb-0">{children}</ol>,
              li:     ({ children }) => <li className="mb-1">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold" style={{ color: "var(--chrome-shine)" }}>{children}</strong>,
              h1:     ({ children }) => <h1 className="mb-2 text-base font-bold">{children}</h1>,
              h2:     ({ children }) => <h2 className="mb-2 text-sm font-bold">{children}</h2>,
              h3:     ({ children }) => <h3 className="mb-1 text-sm font-semibold">{children}</h3>,
            }}
          >
            {content}
          </ReactMarkdown>
        ) : (
          <span className="animate-pulse opacity-50">▍</span>
        )}
      </div>
    </div>
  );
});

// ── Contact modal ─────────────────────────────────────────────────────────────
function ContactModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSend() {
    const subject = encodeURIComponent(`Reaching out via your resume chatbot`);
    const body = encodeURIComponent(
      `Hi Mathan,\n\nMy name is ${name || "(name)"} and I wanted to reach out.\n\n${message}\n\nBest,\n${name || "(name)"}\n${email ? `${email}` : ""}`
    );
    window.open(`mailto:perlmathan@gmail.com?subject=${subject}&body=${body}`);
    onClose();
  }

  const inputStyle = {
    width: "100%",
    borderRadius: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    padding: "10px 14px",
    fontSize: 14,
    color: "var(--text-primary)",
    outline: "none",
  } as React.CSSProperties;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-t-2xl p-6 shadow-2xl sm:rounded-2xl"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid rgba(110,181,255,0.15)",
          boxShadow: "0 0 60px rgba(79,142,247,0.15)",
        }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: "var(--chrome-shine)" }}>
            Get in touch with Mathan
          </h2>
          <button
            onClick={onClose}
            className="transition-opacity hover:opacity-60"
            style={{ color: "var(--metal-mid)" }}
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
          <input
            type="email"
            placeholder="Your email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <textarea
            placeholder="Message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "none" }}
          />
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={handleSend}
            className="w-full rounded-full py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #4f8ef7, #2563eb)",
              boxShadow: "0 0 20px rgba(79,142,247,0.35)",
            }}
          >
            Open in email client
          </button>
          <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Or email directly:{" "}
            <a
              href="mailto:perlmathan@gmail.com"
              className="underline transition-opacity hover:opacity-70"
              style={{ color: "var(--accent-glow)" }}
            >
              perlmathan@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({
  onChipClick,
  isLoading,
  atMessageLimit,
  onContact,
}: {
  onChipClick: (q: string) => void;
  isLoading: boolean;
  atMessageLimit: boolean;
  onContact: () => void;
}) {
  return (
    <aside
      className="hidden md:flex w-80 shrink-0 flex-col relative z-10"
      style={{
        background: "rgba(12,12,18,0.85)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(110,181,255,0.15)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {/* Identity card */}
      <div className="flex flex-col items-center px-6 pt-10 pb-6">
        {/* Avatar with breathing glow ring */}
        <div
          className="avatar-glow mb-5 flex h-20 w-20 items-center justify-center rounded-full text-xl font-bold"
          style={{
            background: "linear-gradient(135deg, #1a2035, #0e1525)",
            border: "2px solid rgba(110,181,255,0.3)",
            color: "var(--chrome-shine)",
            letterSpacing: "-0.5px",
          }}
        >
          MP
        </div>

        {/* Name */}
        <h1
          className="text-center text-xl font-semibold"
          style={{ color: "var(--chrome-shine)", letterSpacing: "-0.3px" }}
        >
          Mathan Perl
        </h1>

        {/* Title */}
        <p
          className="mt-1 text-center text-sm"
          style={{ color: "var(--metal-mid)" }}
        >
          Senior Partnerships Manager
        </p>
        <p
          className="text-center text-xs"
          style={{ color: "var(--metal-dark)" }}
        >
          Unity · New York
        </p>

        {/* Divider */}
        <div
          className="mt-5 w-full h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(110,181,255,0.2), transparent)",
          }}
        />
      </div>

      {/* Suggested questions */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <p
          className="mb-3 px-2 text-xs font-medium uppercase tracking-widest"
          style={{ color: "var(--metal-dark)" }}
        >
          Ask me
        </p>
        {!atMessageLimit &&
          SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => onChipClick(q)}
              disabled={isLoading}
              className="mb-2 w-full rounded-xl px-3 py-2.5 text-left text-xs transition-all disabled:opacity-40"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "var(--metal-mid)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "rgba(110,181,255,0.3)";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--metal-light)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 0 12px rgba(79,142,247,0.1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--metal-mid)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              {q}
            </button>
          ))}
      </div>

      {/* Bottom action buttons */}
      <div
        className="px-4 pb-6 pt-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <button
          onClick={onContact}
          className="w-full rounded-xl py-2.5 text-sm font-medium transition-all hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #4f8ef7, #2563eb)",
            boxShadow: "0 0 20px rgba(79,142,247,0.25)",
            color: "#fff",
          }}
        >
          Get in touch
        </button>
        <div className="mt-2 flex gap-2">
          <a
            href="https://linkedin.com/in/mathanperl"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--metal-mid)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                "rgba(110,181,255,0.25)";
              (e.currentTarget as HTMLAnchorElement).style.color =
                "var(--metal-light)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                "rgba(255,255,255,0.08)";
              (e.currentTarget as HTMLAnchorElement).style.color =
                "var(--metal-mid)";
            }}
          >
            LinkedIn
          </a>
          <a
            href="/resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--metal-mid)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                "rgba(110,181,255,0.25)";
              (e.currentTarget as HTMLAnchorElement).style.color =
                "var(--metal-light)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                "rgba(255,255,255,0.08)";
              (e.currentTarget as HTMLAnchorElement).style.color =
                "var(--metal-mid)";
            }}
          >
            Resume
          </a>
        </div>
      </div>
    </aside>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [showContact, setShowContact] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const atMessageLimit =
    messages.filter((m) => m.id !== "welcome").length >= MAX_MESSAGES;

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading || atMessageLimit) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
      };

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
      };

      const history = messages.filter((m) => m.id !== "welcome");
      const updatedMessages = [...history, userMessage];

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInput("");
      setIsLoading(true);
      setStreamingId(assistantMessage.id);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map(({ role, content }) => ({
              role,
              content,
            })),
          }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: (m.content as string) + chunk }
                : m
            )
          );
        }
      } catch (err) {
        console.error(err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, content: "Sorry, something went wrong. Please try again." }
              : m
          )
        );
      } finally {
        setIsLoading(false);
        setStreamingId(null);
      }
    },
    [isLoading, atMessageLimit, messages]
  );

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSend(input);
  }

  return (
    <div className="space-bg flex h-dvh overflow-hidden">
      {/* ── Left sidebar (desktop) ──────────────────── */}
      <Sidebar
        onChipClick={handleSend}
        isLoading={isLoading}
        atMessageLimit={atMessageLimit}
        onContact={() => setShowContact(true)}
      />

      {/* ── Right panel ────────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header
          className="flex shrink-0 items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          {/* Mobile: show name (hidden on desktop where sidebar has it) */}
          <span
            className="text-sm font-medium md:invisible"
            style={{ color: "var(--metal-mid)" }}
          >
            Chat with Mathan Perl
          </span>

          <button
            onClick={() => setShowContact(true)}
            className="ml-auto rounded-full px-4 py-1.5 text-sm font-medium transition-all"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              color: "var(--metal-mid)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(110,181,255,0.4)";
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--chrome-shine)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 12px rgba(110,181,255,0.15)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(255,255,255,0.12)";
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--metal-mid)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            }}
          >
            Get in touch
          </button>
        </header>

        {/* Messages */}
        <main className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-6">
          <div className="w-full max-w-2xl space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isStreaming={isLoading && message.id === streamingId}
              />
            ))}

            {atMessageLimit && (
              <p
                className="text-center text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Conversation limit reached. Refresh to start a new chat.
              </p>
            )}

            <div ref={bottomRef} />
          </div>
        </main>

        {/* Input footer */}
        <footer className="shrink-0 px-4 pb-5 pt-3">
          <div className="mx-auto w-full max-w-2xl space-y-2">
            {/* Mobile chips (sidebar hidden on mobile) */}
            {!atMessageLimit && (
              <div className="flex flex-wrap gap-1.5 md:hidden">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    disabled={isLoading}
                    className="rounded-full px-3 py-1 text-xs transition-all disabled:opacity-40"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "var(--metal-mid)",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input form */}
            <form onSubmit={handleFormSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  atMessageLimit
                    ? "Conversation limit reached — refresh to continue"
                    : "Ask about his experience, skills, or background..."
                }
                disabled={isLoading || atMessageLimit}
                className="flex-1 text-sm transition-all disabled:opacity-50"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  backdropFilter: "blur(10px)",
                  boxShadow:
                    "0 0 0 1px rgba(110,181,255,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
                  padding: "10px 18px",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(110,181,255,0.4)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(79,142,247,0.1), inset 0 1px 0 rgba(255,255,255,0.05)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 1px rgba(110,181,255,0.08), inset 0 1px 0 rgba(255,255,255,0.05)";
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || atMessageLimit}
                className="shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, #4f8ef7, #2563eb)",
                  boxShadow: "0 0 20px rgba(79,142,247,0.3)",
                }}
                onMouseEnter={(e) => {
                  if (!(e.currentTarget as HTMLButtonElement).disabled) {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "0 0 30px rgba(79,142,247,0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 0 20px rgba(79,142,247,0.3)";
                }}
              >
                Send
              </button>
            </form>
          </div>
        </footer>
      </div>

      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    </div>
  );
}
