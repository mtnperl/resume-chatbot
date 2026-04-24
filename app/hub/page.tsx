"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Tool = {
  name: string;
  tag: string;
  description: string;
  href: string;
  external: boolean;
};

const TOOLS: Tool[] = [
  {
    name: "Lunia Studio",
    tag: "CREATIVE_OPS",
    description: "Creative ops & analytics workspace.",
    href: "/luniastudio",
    external: false,
  },
  {
    name: "Mitzim",
    tag: "MITZIM",
    description: "Open the Mitzim workspace.",
    href: "https://mitzim.vercel.app",
    external: true,
  },
  {
    name: "Chatbot",
    tag: "CAREER_AGENT",
    description: "Conversational career agent with personas.",
    href: "/jobchat",
    external: false,
  },
  {
    name: "CV Tailor",
    tag: "CV_ENGINE",
    description: "Tailor CV + cover letter to any job description.",
    href: "/cvtailor",
    external: false,
  },
  {
    name: "Finance Family",
    tag: "FINANCE",
    description: "Household finance dashboard.",
    href: "https://family-finance-bay-zeta.vercel.app",
    external: true,
  },
];

export default function HubPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; }

        .scanlines {
          position: fixed; inset: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px);
          pointer-events: none; z-index: 10;
        }
        .crt-glow {
          position: fixed; inset: 0;
          background: radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.7) 100%);
          pointer-events: none; z-index: 11;
        }

        .hub {
          font-family: 'Share Tech Mono', 'Courier New', monospace;
          color: #e8e8e8;
          min-height: 100dvh;
          padding: 40px 24px 80px;
          position: relative; z-index: 1;
          max-width: 1100px; margin: 0 auto;
        }
        .topbar {
          display: flex; justify-content: space-between; align-items: baseline;
          margin-bottom: 32px;
        }
        .title { font-size: clamp(18px, 3.5vw, 24px); letter-spacing: 0.35em; text-transform: uppercase; }
        .subtitle { font-size: 10px; letter-spacing: 0.2em; opacity: 0.5; margin-top: 4px; }
        .logout {
          background: transparent; border: 1px solid #ffffff33; color: #e8e8e8;
          font-family: inherit; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase;
          padding: 8px 14px; cursor: pointer;
        }
        .logout:hover:not(:disabled) { background: #ffffff12; }
        .logout:disabled { opacity: 0.4; cursor: not-allowed; }

        .divider { border: none; border-top: 1px solid #ffffff1a; margin: 24px 0; }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }

        .tile {
          display: block;
          border: 1px solid #ffffff22;
          padding: 22px 20px 20px;
          box-shadow: inset 0 0 30px #00000060;
          text-decoration: none;
          color: inherit;
          transition: border-color 0.15s, background 0.15s, transform 0.15s;
        }
        .tile:hover { border-color: #ffffff55; background: #ffffff08; transform: translateY(-1px); }
        .tile-tag { font-size: 10px; letter-spacing: 0.25em; opacity: 0.5; }
        .tile-name { font-size: 18px; letter-spacing: 0.18em; text-transform: uppercase; margin: 6px 0 10px; }
        .tile-desc { font-size: 12px; letter-spacing: 0.04em; opacity: 0.7; line-height: 1.6; min-height: 3.2em; }
        .tile-foot {
          margin-top: 14px;
          display: flex; justify-content: space-between; align-items: center;
          font-size: 10px; letter-spacing: 0.2em; opacity: 0.55;
        }
        .tile-ext::after { content: " ↗"; }

        .footer {
          margin-top: 48px;
          font-size: 10px; letter-spacing: 0.25em; opacity: 0.35; text-align: center;
        }
      `}</style>

      <div className="scanlines" />
      <div className="crt-glow" />

      <div className="hub">
        <div className="topbar">
          <div>
            <div className="title">// CONTROL PANEL</div>
            <div className="subtitle">MATHAN.EXE · SESSION ACTIVE</div>
          </div>
          <button
            className="logout"
            onClick={logout}
            disabled={loggingOut}
            aria-label="Log out"
          >
            {loggingOut ? "SIGNING OUT..." : "LOGOUT"}
          </button>
        </div>

        <hr className="divider" />

        <div className="grid">
          {TOOLS.map((tool) => (
            <a
              key={tool.name}
              className="tile"
              href={tool.href}
              {...(tool.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              <div className="tile-tag">&gt; {tool.tag}</div>
              <div className="tile-name">{tool.name}</div>
              <div className="tile-desc">{tool.description}</div>
              <div className="tile-foot">
                <span>{tool.external ? "EXTERNAL" : "INTERNAL"}</span>
                <span className={tool.external ? "tile-ext" : ""}>OPEN</span>
              </div>
            </a>
          ))}
        </div>

        <div className="footer">
          &gt;&gt; MATHANPERL.COM // ALL SYSTEMS NOMINAL &lt;&lt;
        </div>
      </div>
    </>
  );
}
