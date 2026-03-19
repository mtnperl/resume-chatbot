"use client";

import { useState, useRef, useEffect, memo, useCallback } from "react";
import type { Anthropic } from "@anthropic-ai/sdk";
import ReactMarkdown from "react-markdown";
import { MAX_MESSAGES } from "@/lib/constants";
import jsPDF from "jspdf";
import RoleFitAnalyzer from "@/components/RoleFitAnalyzer";
import Timeline from "@/components/Timeline";
import PersonaSelector from "@/components/PersonaSelector";
import { personaReplies } from "@/lib/prompts";

type Message = Anthropic.MessageParam & { id: string };
type Persona = "recruiter" | "friend" | "luke" | "chris" | null;

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Ask me anything about Mathan — his career, how he operates, what drives him, or what makes him different.",
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
  prevUserQuestion,
}: {
  message: Message;
  isStreaming: boolean;
  prevUserQuestion?: string;
}) {
  const content = message.content as string;
  const isUser = message.role === "user";
  const isWelcome = message.id === "welcome";
  const showAskButton = !isUser && !isWelcome && !isStreaming && content && prevUserQuestion;

  const askHref = `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=perlmathan@gmail.com&su=${encodeURIComponent("Question via Resume Chatbot")}&body=${encodeURIComponent(`Hi Mathan,\n\nI was checking out your resume chatbot and wanted to ask you directly:\n\n${prevUserQuestion ?? ""}`)}`;

  return (
    <div className={`message-bubble flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className="max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
        style={
          isUser
            ? {
                background: "var(--bubble-user-bg)",
                border: "1px solid var(--bubble-user-border)",
                boxShadow: "0 0 20px var(--bubble-user-shadow)",
                color: "var(--bubble-user-color)",
              }
            : {
                background: "var(--bubble-assistant-bg)",
                border: "1px solid var(--bubble-assistant-border)",
                color: "var(--bubble-assistant-color)",
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
      {showAskButton && (
        <a
          href={askHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 text-xs transition-opacity hover:opacity-100 opacity-50"
          style={{ color: "var(--accent-glow)" }}
        >
          ↗ Ask Mathan directly
        </a>
      )}
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
    background: "var(--modal-input-bg)",
    border: "1px solid var(--modal-input-border)",
    padding: "10px 14px",
    fontSize: 14,
    color: "var(--text-primary)",
    outline: "none",
  } as React.CSSProperties;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: "var(--modal-overlay)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-t-2xl p-6 shadow-2xl sm:rounded-2xl"
        style={{
          background: "var(--modal-bg)",
          border: "1px solid var(--modal-border)",
          boxShadow: "var(--modal-shadow)",
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
          <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          <input type="email" placeholder="Your email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          <textarea placeholder="Message (optional)" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} style={{ ...inputStyle, resize: "none" }} />
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={handleSend}
            className="w-full rounded-full py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "var(--send-bg)", boxShadow: "var(--send-shadow)" }}
          >
            Open in email client
          </button>
          <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Or email directly:{" "}
            <a href="mailto:perlmathan@gmail.com" className="underline transition-opacity hover:opacity-70" style={{ color: "var(--accent-glow)" }}>
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
        background: "var(--sidebar-bg)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid var(--sidebar-border-r)",
        boxShadow: "var(--sidebar-shadow)",
      }}
    >
      {/* Identity card */}
      <div className="flex flex-col items-center px-6 pt-10 pb-6">
        {/* Avatar with breathing glow ring */}
        <div className="mb-5 h-20 w-20 rounded-full overflow-hidden">
          <img
            src="/profile_mathan.jpg"
            alt="Mathan Perl"
            className="h-full w-full object-cover object-top"
          />
        </div>

        {/* Name */}
        <h1 className="text-center text-xl font-semibold" style={{ color: "var(--chrome-shine)", letterSpacing: "-0.3px" }}>
          Mathan Perl
        </h1>

        {/* Title */}
        <p className="mt-1 text-center text-sm" style={{ color: "var(--metal-mid)" }}>
          Senior Partnerships Manager
        </p>
        <p className="text-center text-xs" style={{ color: "var(--metal-dark)" }}>
          Unity · New York
        </p>

        {/* Divider */}
        <div className="mt-5 w-full h-px" style={{ background: "var(--divider-bg)" }} />
      </div>

      {/* Suggested questions */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <p className="mb-3 px-2 text-xs font-medium uppercase tracking-widest" style={{ color: "var(--metal-dark)" }}>
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
                background: "var(--chip-bg)",
                border: "1px solid var(--chip-border)",
                color: "var(--metal-mid)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = "var(--chip-hover-border)";
                el.style.color = "var(--chip-hover-color)";
                el.style.boxShadow = "var(--chip-hover-glow)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = "var(--chip-border)";
                el.style.color = "var(--metal-mid)";
                el.style.boxShadow = "none";
              }}
            >
              {q}
            </button>
          ))}
      </div>

      {/* Bottom action buttons */}
      <div className="px-4 pb-6 pt-3" style={{ borderTop: "1px solid var(--header-border)" }}>
        <button
          onClick={onContact}
          className="w-full rounded-xl py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: "var(--send-bg)", boxShadow: "var(--send-shadow)" }}
        >
          Get in touch
        </button>
        <div className="mt-2 flex gap-2">
          {[
            { label: "LinkedIn", href: "https://www.linkedin.com/in/mathan-perl-9b442076/" },
            { label: "Resume",   href: "/resume.pdf" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center rounded-xl py-2 text-xs transition-all"
              style={{
                background: "var(--link-btn-bg)",
                border: "1px solid var(--link-btn-border)",
                color: "var(--metal-mid)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.borderColor = "var(--link-btn-hover-border)";
                el.style.color = "var(--link-btn-hover-color)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.borderColor = "var(--link-btn-border)";
                el.style.color = "var(--metal-mid)";
              }}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ── Theme toggle button ───────────────────────────────────────────────────────
function ThemeToggle({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle theme"
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
      {theme === "dark" ? "☀ Light" : "🌙 Dark"}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [shareToast, setShareToast] = useState<"idle" | "copying" | "copied">("idle");
  const [persona, setPersona] = useState<Persona>(null);
  const sessionId = useRef<string>(crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load persisted theme (after hydration to avoid SSR mismatch)
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    if (saved) setTheme(saved);
  }, []);

  // Apply theme to <html> so CSS vars cascade everywhere
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const atMessageLimit =
    messages.filter((m) => m.id !== "welcome").length >= MAX_MESSAGES;

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading || atMessageLimit || !persona) return;

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
      setFollowUpQuestions([]);

      // Log user message for recruiter sessions (fire-and-forget)
      if (persona === "recruiter") {
        fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "message",
            sessionId: sessionId.current,
            role: "user",
            content: text.trim(),
          }),
        }).catch(() => {});
      }

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map(({ role, content }) => ({ role, content })),
            persona: persona ?? "recruiter",
          }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          fullContent += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: (m.content as string) + chunk }
                : m
            )
          );
        }

        // Log assistant reply for recruiter sessions (fire-and-forget)
        if (persona === "recruiter" && fullContent) {
          fetch("/api/analytics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "message",
              sessionId: sessionId.current,
              role: "assistant",
              content: fullContent,
            }),
          }).catch(() => {});
        }

        // Fetch follow-up questions in the background after stream completes
        if (fullContent) {
          fetch("/api/follow-ups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lastAnswer: fullContent }),
          })
            .then((r) => r.json())
            .then(({ questions }) => {
              if (Array.isArray(questions) && questions.length > 0) {
                setFollowUpQuestions(questions);
              }
            })
            .catch(() => {});
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
    [isLoading, atMessageLimit, messages, persona]
  );

  function handlePersonaSelect(selected: string) {
    setPersona(selected as Persona);
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: personaReplies[selected] ?? personaReplies.recruiter,
      },
    ]);
    // Log persona click (all users) and session start (recruiter only)
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "persona_click", sessionId: sessionId.current, persona: selected }),
    }).catch(() => {});
    if (selected === "recruiter") {
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "session_start",
          sessionId: sessionId.current,
          persona: selected,
          referrer: document.referrer || null,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {});
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSend(input);
  }

  function downloadPDF() {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(26, 29, 38);
    doc.text("Conversation with Mathan Perl", margin, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 99, 117);
    doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), margin, y);
    y += 3;

    // Divider
    doc.setDrawColor(200, 205, 214);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    const conversationMessages = messages.filter((m) => m.id !== "welcome");
    for (const msg of conversationMessages) {
      const isUser = msg.role === "user";
      const label = isUser ? "RECRUITER" : "MATHAN.AI";
      const content = msg.content as string;

      // Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(isUser ? 37 : 110, isUser ? 99 : 131, isUser ? 235 : 255);
      doc.text(label, margin, y);
      y += 5;

      // Content (strip markdown)
      const plain = content
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/^#+\s/gm, "")
        .replace(/^[-*]\s/gm, "• ");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(42, 47, 61);
      const lines = doc.splitTextToSize(plain, contentWidth);

      // Page overflow check
      if (y + lines.length * 5 > 277) {
        doc.addPage();
        y = 20;
      }

      doc.text(lines, margin, y);
      y += lines.length * 5 + 8;
    }

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(154, 160, 175);
    doc.text("perlmathan@gmail.com · +1 917-715-1544 · linkedin.com/in/mathan-perl-9b442076", margin, 285);

    doc.save("mathan-perl-conversation.pdf");
  }

  const canDownload = messages.filter((m) => m.id !== "welcome").length >= 2;
  const canShare = canDownload;

  async function shareConversation() {
    if (shareToast !== "idle") return;
    setShareToast("copying");
    try {
      const conversation = messages
        .filter((m) => m.id !== "welcome")
        .map(({ role, content }) => ({ role, content }));
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation }),
      });
      const { url } = await res.json();
      await navigator.clipboard.writeText(url);
      setShareToast("copied");
      setTimeout(() => setShareToast("idle"), 2500);
    } catch {
      setShareToast("idle");
    }
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
          className="flex shrink-0 items-center gap-2 px-5 py-3"
          style={{ borderBottom: "1px solid var(--header-border)" }}
        >
          {/* Mobile: show name (hidden on desktop where sidebar has it) */}
          <span className="text-sm font-medium md:invisible" style={{ color: "var(--metal-mid)" }}>
            Chat with Mathan Perl
          </span>

          <div className="ml-auto flex items-center gap-2">
            <Timeline onSelectPrompt={handleSend} />
            <RoleFitAnalyzer />
            <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "light" ? "dark" : "light")} />
            {canShare && (
              <button
                onClick={shareConversation}
                disabled={shareToast === "copying"}
                className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-60"
                style={{ border: "1px solid var(--header-btn-border)", color: shareToast === "copied" ? "var(--accent-glow)" : "var(--metal-mid)" }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = "var(--chip-hover-border)";
                  el.style.color = "var(--chrome-shine)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = "var(--header-btn-border)";
                  el.style.color = shareToast === "copied" ? "var(--accent-glow)" : "var(--metal-mid)";
                }}
              >
                {shareToast === "copied" ? "✓ Copied!" : shareToast === "copying" ? "…" : "↗ Share"}
              </button>
            )}
            {canDownload && (
              <button
                onClick={downloadPDF}
                className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
                style={{ border: "1px solid var(--header-btn-border)", color: "var(--metal-mid)" }}
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
                ↓ PDF
              </button>
            )}
            <button
              onClick={() => setShowContact(true)}
              className="rounded-full px-4 py-1.5 text-sm font-medium transition-all"
              style={{ border: "1px solid var(--header-btn-border)", color: "var(--metal-mid)" }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = "var(--chip-hover-border)";
                el.style.color = "var(--chrome-shine)";
                el.style.boxShadow = "0 0 12px var(--chip-hover-glow)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = "var(--header-btn-border)";
                el.style.color = "var(--metal-mid)";
                el.style.boxShadow = "none";
              }}
            >
              Get in touch
            </button>
          </div>
        </header>

        {/* Messages */}
        <main className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-6">
          <div className="w-full max-w-2xl">
          {!persona ? (
            <PersonaSelector onSelect={handlePersonaSelect} />
          ) : (
          <div className="space-y-4">
            {messages.map((message, i) => {
              const prevUserMsg = messages
                .slice(0, i)
                .reverse()
                .find((m) => m.role === "user");
              const isLastMessage = i === messages.length - 1;
              return (
                <div key={message.id}>
                  <MessageBubble
                    message={message}
                    isStreaming={isLoading && message.id === streamingId}
                    prevUserQuestion={prevUserMsg?.content as string | undefined}
                  />
                  {/* Follow-up chips below the last assistant message */}
                  {isLastMessage &&
                    message.role === "assistant" &&
                    !isLoading &&
                    followUpQuestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {followUpQuestions.map((q) => (
                          <button
                            key={q}
                            onClick={() => handleSend(q)}
                            className="rounded-xl px-3 py-1.5 text-xs transition-all"
                            style={{
                              background: "var(--chip-bg)",
                              border: "1px solid var(--chip-border)",
                              color: "var(--metal-mid)",
                            }}
                            onMouseEnter={(e) => {
                              const el = e.currentTarget as HTMLButtonElement;
                              el.style.borderColor = "var(--chip-hover-border)";
                              el.style.color = "var(--chip-hover-color)";
                              el.style.boxShadow = "var(--chip-hover-glow)";
                            }}
                            onMouseLeave={(e) => {
                              const el = e.currentTarget as HTMLButtonElement;
                              el.style.borderColor = "var(--chip-border)";
                              el.style.color = "var(--metal-mid)";
                              el.style.boxShadow = "none";
                            }}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              );
            })}

            {atMessageLimit && (
              <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
                Conversation limit reached. Refresh to start a new chat.
              </p>
            )}

            <div ref={bottomRef} />
          </div>
          )}
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
                      background: "var(--chip-bg)",
                      border: "1px solid var(--chip-border)",
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
                  !persona
                    ? "Select who you are above to start chatting..."
                    : atMessageLimit
                    ? "Conversation limit reached — refresh to continue"
                    : "Ask about his experience, skills, or background..."
                }
                disabled={isLoading || atMessageLimit || !persona}
                className="flex-1 text-sm transition-all disabled:opacity-50"
                style={{
                  background: "var(--input-bg)",
                  border: "1px solid var(--input-border)",
                  borderRadius: 16,
                  backdropFilter: "blur(10px)",
                  boxShadow: "var(--input-shadow)",
                  padding: "10px 18px",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--input-focus-border)";
                  e.currentTarget.style.boxShadow = "var(--input-focus-shadow)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--input-border)";
                  e.currentTarget.style.boxShadow = "var(--input-shadow)";
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || atMessageLimit || !persona}
                className="shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: "var(--send-bg)", boxShadow: "var(--send-shadow)" }}
                onMouseEnter={(e) => {
                  if (!(e.currentTarget as HTMLButtonElement).disabled)
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--send-shadow-hover)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--send-shadow)";
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
