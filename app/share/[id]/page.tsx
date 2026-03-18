import { kv } from "@/lib/kv";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Message = { role: "user" | "assistant"; content: string };

export const metadata: Metadata = {
  title: "Shared Conversation · Mathan Perl",
  description: "A shared conversation from the Mathan Perl resume chatbot.",
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await kv.get<string>(`share:${id}`);
  if (!raw) notFound();

  const messages: Message[] = typeof raw === "string" ? JSON.parse(raw) : (raw as Message[]);

  return (
    <div
      className="min-h-screen px-4 py-10"
      style={{ background: "var(--bg-void)", color: "var(--text-primary)" }}
    >
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-full overflow-hidden border-2" style={{ borderColor: "var(--avatar-ring)" }}>
            <img src="/profile_mathan.jpg" alt="Mathan Perl" className="h-full w-full object-cover object-top" />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--chrome-shine)" }}>
            Conversation with Mathan Perl
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--metal-mid)" }}>
            Shared from the resume chatbot
          </p>
          <a
            href="/"
            className="mt-3 inline-block rounded-full px-4 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: "var(--send-bg)", color: "#fff" }}
          >
            Chat with Mathan
          </a>
        </div>

        {/* Divider */}
        <div className="mb-6 h-px" style={{ background: "var(--divider-bg)" }} />

        {/* Messages */}
        <div className="space-y-4">
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                  style={
                    isUser
                      ? {
                          background: "var(--bubble-user-bg)",
                          border: "1px solid var(--bubble-user-border)",
                          color: "var(--bubble-user-color)",
                        }
                      : {
                          background: "var(--bubble-assistant-bg)",
                          border: "1px solid var(--bubble-assistant-border)",
                          color: "var(--bubble-assistant-color)",
                        }
                  }
                >
                  <span
                    className="mb-2 block text-xs font-semibold uppercase tracking-widest"
                    style={{ color: "var(--metal-dark)" }}
                  >
                    {isUser ? "Recruiter" : "Mathan.ai"}
                  </span>
                  {msg.content}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-xs" style={{ color: "var(--text-muted)" }}>
          <a href="/" className="underline hover:opacity-80">
            Ask your own questions →
          </a>
        </div>
      </div>
    </div>
  );
}
