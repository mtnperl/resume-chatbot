"use client";

import { useEffect, useState } from "react";

const BOOT_LINES = [
  "INITIALIZING SYSTEM...",
  "LOADING MATHAN.EXE...",
  "CHECKING CREDENTIALS............. OK",
  "MOUNTING CAREER DATA.............. OK",
  "CALIBRATING AMBITION LEVELS....... OK",
  "VERIFYING REFERENCES.............. OK",
  "BREWING COFFEE.................... OK",
  "ALMOST READY....",
];

export default function ComingSoon() {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [blink, setBlink] = useState(true);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

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
    }, 420);
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
        return p + Math.random() * 3.5;
      });
    }, 180);
    return () => clearInterval(t);
  }, []);

  const filled = Math.round((Math.min(progress, 100) / 100) * 24);
  const empty = 24 - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  const pct = Math.round(Math.min(progress, 100));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          background: #000;
          overflow: hidden;
        }

        .scanlines {
          position: fixed;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.15) 2px,
            rgba(0,0,0,0.15) 4px
          );
          pointer-events: none;
          z-index: 10;
        }

        .crt-glow {
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.7) 100%);
          pointer-events: none;
          z-index: 11;
        }

        .terminal {
          font-family: 'Share Tech Mono', 'Courier New', monospace;
          color: #e8e8e8;
          text-shadow: none;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          position: relative;
          z-index: 1;
        }

        .box {
          border: 1px solid #ffffff22;
          padding: 40px 48px;
          max-width: 600px;
          width: 100%;
          box-shadow: inset 0 0 40px #00000060;
        }

        .header {
          text-align: center;
          margin-bottom: 32px;
        }

        .name {
          font-size: clamp(22px, 5vw, 32px);
          letter-spacing: 0.35em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .tagline {
          font-size: 11px;
          letter-spacing: 0.2em;
          opacity: 0.5;
        }

        .divider {
          border: none;
          border-top: 1px solid #ffffff1a;
          margin: 24px 0;
        }

        .boot-log {
          font-size: 12px;
          letter-spacing: 0.05em;
          line-height: 2;
          min-height: 180px;
        }

        .line { opacity: 0.8; }

        .progress-section {
          margin-top: 28px;
        }

        .progress-label {
          font-size: 10px;
          letter-spacing: 0.2em;
          opacity: 0.5;
          margin-bottom: 8px;
        }

        .progress-bar {
          font-size: 14px;
          letter-spacing: 0.02em;
        }

        .coming-soon {
          text-align: center;
          margin-top: 36px;
          font-size: clamp(18px, 4vw, 26px);
          letter-spacing: 0.3em;
          animation: pulse 2s ease-in-out infinite;
        }

        .sub {
          text-align: center;
          font-size: 11px;
          letter-spacing: 0.15em;
          opacity: 0.45;
          margin-top: 10px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      <div className="scanlines" />
      <div className="crt-glow" />

      <div className="terminal">
        <div className="box">
          <div className="header">
            <div className="name">MATHAN PERL</div>
            <div className="tagline">SENIOR PARTNERSHIPS MANAGER · NEW YORK</div>
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
            <div className="progress-bar">
              [{bar}] {pct}%
            </div>
          </div>

          {done && (
            <>
              <hr className="divider" />
              <div className="coming-soon">
                &gt;&gt; COMING SOON &lt;&lt;
              </div>
              <div className="sub">
                SOMETHING IS LOADING. CHECK BACK SOON{blink ? "." : " "}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
