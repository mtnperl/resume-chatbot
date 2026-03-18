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

// Memoized message bubble — only re-renders when its own content changes
const MessageBubble = memo(function MessageBubble({
  message,
  isStreaming,
}: {
  message: Message;
  isStreaming: boolean;
}) {
  const content = message.content as string;

  return (
    <div
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          message.role === "user"
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700"
        }`}
      >
        {message.role === "user" ? (
          content || (
            <span className="animate-pulse text-zinc-400">▍</span>
          )
        ) : isStreaming && !content ? (
          // Typing indicator — three animated dots before first token arrives
          <span className="flex items-center gap-1 text-zinc-400">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
          </span>
        ) : content ? (
          <ReactMarkdown
            components={{
              p: ({ children }) => (
                <p className="mb-2 last:mb-0">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-2 list-disc pl-4 last:mb-0">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-2 list-decimal pl-4 last:mb-0">{children}</ol>
              ),
              li: ({ children }) => <li className="mb-1">{children}</li>,
              strong: ({ children }) => (
                <strong className="font-semibold">{children}</strong>
              ),
              h1: ({ children }) => (
                <h1 className="mb-2 text-base font-bold">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-2 text-sm font-bold">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-1 text-sm font-semibold">{children}</h3>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        ) : (
          <span className="animate-pulse text-zinc-400">▍</span>
        )}
      </div>
    </div>
  );
});

// Contact modal — client-side mailto approach
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Get in touch with Mathan
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
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
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <input
            type="email"
            placeholder="Your email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <textarea
            placeholder="Message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={handleSend}
            className="w-full rounded-full bg-zinc-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Open in email client
          </button>
          <p className="text-center text-xs text-zinc-400">
            Or email directly:{" "}
            <a
              href="mailto:perlmathan@gmail.com"
              className="underline hover:text-zinc-600"
            >
              perlmathan@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

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

  const atMessageLimit = messages.filter((m) => m.id !== "welcome").length >= MAX_MESSAGES;

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

      // Build the messages array to send (exclude the welcome placeholder)
      const history = messages.filter((m) => m.id !== "welcome");
      const updatedMessages = [...history, userMessage];

      setMessages((prev) => [
        ...prev,
        userMessage,
        assistantMessage,
      ]);
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

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

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
                : m,
            ),
          );
        }
      } catch (err) {
        console.error(err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? {
                  ...m,
                  content: "Sorry, something went wrong. Please try again.",
                }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
        setStreamingId(null);
      }
    },
    [isLoading, atMessageLimit, messages],
  );

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSend(input);
  }

  function handleChipClick(question: string) {
    handleSend(question);
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Chat with Mathan Perl
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Ask me anything about my background and experience
            </p>
          </div>
          <button
            onClick={() => setShowContact(true)}
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500"
          >
            Get in touch
          </button>
        </div>
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
            <p className="text-center text-xs text-zinc-400 dark:text-zinc-600">
              Conversation limit reached. Refresh to start a new chat.
            </p>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="border-t border-zinc-200 bg-white px-4 pb-4 pt-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto w-full max-w-2xl space-y-2">
          {/* Suggested questions */}
          {!atMessageLimit && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleChipClick(q)}
                  disabled={isLoading}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:bg-zinc-700"
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
                  : "Ask about my experience, skills, or background..."
              }
              disabled={isLoading || atMessageLimit}
              className="flex-1 rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-700"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || atMessageLimit}
              className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Send
            </button>
          </form>
        </div>
      </footer>

      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    </div>
  );
}
