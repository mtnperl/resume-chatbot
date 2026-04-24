"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const BOOT_LINES = [
  "INITIALIZING SYSTEM...",
  "LOADING MATHAN.EXE...",
  "MOUNTING TOOL MANIFEST........... OK",
  "CALIBRATING AMBITION LEVELS...... OK",
  "VERIFYING REFERENCES............. OK",
  "BREWING COFFEE................... OK",
  "AWAITING CREDENTIALS.............",
];

export default function Gate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/hub";

  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [blink, setBlink] = useState(true);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < BOOT_LINES.length) {
        setVisibleLines((prev) => [...prev, BOOT_LINES[i]]);
        i++;
      } else {
        clearInterval(interval);
        setDone(true);
      }
    }, 360);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 530);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(t); return 100; }
        return p + Math.random() * 4;
      });
    }, 160);
    return () => clearInterval(t);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace(nextPath.startsWith("/") ? nextPath : "/hub");
        router.refresh();
        return;
      }
      if (res.status === 429) {
        setError("TOO MANY ATTEMPTS. STAND BY.");
      } else {
        setError("ACCESS DENIED.");
      }
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } catch {
      setError("CONNECTION FAILURE.");
    } finally {
      setSubmitting(false);
    }
  }

  const filled = Math.round((Math.min(progress, 100) / 100) * 24);
  const empty = 24 - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  const pct = Math.round(Math.min(progress, 100));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body { background: #000; overflow: hidden; }

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
        .terminal {
          font-family: 'Share Tech Mono', 'Courier New', monospace;
          color: #e8e8e8;
          min-height: 100dvh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 40px 24px; position: relative; z-index: 1;
        }
        .box {
          border: 1px solid #ffffff22;
          padding: 40px 48px;
          max-width: 600px; width: 100%;
          box-shadow: inset 0 0 40px #00000060;
        }
        .box.shake { animation: shake 0.4s ease-in-out; }
        .header { text-align: center; margin-bottom: 32px; }
        .name { font-size: clamp(22px, 5vw, 32px); letter-spacing: 0.35em; text-transform: uppercase; margin-bottom: 6px; }
        .tagline { font-size: 11px; letter-spacing: 0.2em; opacity: 0.5; }
        .divider { border: none; border-top: 1px solid #ffffff1a; margin: 24px 0; }
        .boot-log { font-size: 12px; letter-spacing: 0.05em; line-height: 2; min-height: 180px; }
        .line { opacity: 0.8; }
        .progress-section { margin-top: 28px; }
        .progress-label { font-size: 10px; letter-spacing: 0.2em; opacity: 0.5; margin-bottom: 8px; }
        .progress-bar { font-size: 14px; letter-spacing: 0.02em; }

        .gate-form { margin-top: 20px; display: flex; flex-direction: column; gap: 10px; }
        .gate-label { font-size: 11px; letter-spacing: 0.25em; opacity: 0.65; }
        .gate-row { display: flex; gap: 8px; align-items: center; }
        .gate-prompt { font-size: 14px; opacity: 0.7; }
        .gate-input {
          flex: 1;
          background: transparent; border: none; outline: none;
          color: #e8e8e8;
          font-family: inherit; font-size: 14px; letter-spacing: 0.08em;
          padding: 8px 0;
          border-bottom: 1px solid #ffffff22;
        }
        .gate-input:focus { border-bottom-color: #ffffff55; }
        .gate-submit {
          margin-top: 12px;
          background: transparent; border: 1px solid #ffffff33; color: #e8e8e8;
          font-family: inherit; font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase;
          padding: 10px 16px; cursor: pointer;
          transition: background 0.15s;
        }
        .gate-submit:hover:not(:disabled) { background: #ffffff12; }
        .gate-submit:disabled { opacity: 0.4; cursor: not-allowed; }
        .gate-error { font-size: 12px; letter-spacing: 0.15em; color: #ff6b6b; margin-top: 6px; }

        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>

      <div className="scanlines" />
      <div className="crt-glow" />

      <div className="terminal">
        <div className={`box${shake ? " shake" : ""}`}>
          <div className="header">
            <div className="name">MATHAN PERL</div>
            <div className="tagline">ACCESS TERMINAL · NEW YORK</div>
          </div>

          <hr className="divider" />

          <div className="boot-log">
            {visibleLines.map((line, i) => (
              <div key={i} className="line">&gt; {line}</div>
            ))}
            {!done && (
              <div className="line">
                &gt; <span style={{ opacity: blink ? 1 : 0 }}>█</span>
              </div>
            )}
          </div>

          <div className="progress-section">
            <div className="progress-label">LOADING</div>
            <div className="progress-bar">[{bar}] {pct}%</div>
          </div>

          {done && (
            <>
              <hr className="divider" />
              <form className="gate-form" onSubmit={onSubmit}>
                <div className="gate-label">&gt;&gt; ENTER ACCESS KEY</div>
                <div className="gate-row">
                  <span className="gate-prompt">$</span>
                  <input
                    className="gate-input"
                    type="password"
                    autoFocus
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    aria-label="Access password"
                  />
                </div>
                <button
                  className="gate-submit"
                  type="submit"
                  disabled={submitting || !password}
                >
                  {submitting ? "VERIFYING..." : "AUTHENTICATE"}
                </button>
                {error && <div className="gate-error">&gt; {error}</div>}
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
