"use client";

import { TbPlayerEject } from "react-icons/tb";
import { GiPartyHat, GiRevolver } from "react-icons/gi";

type Props = {
  onSelect: (persona: string) => void;
};

type Persona = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

const personas: Persona[] = [
  { id: "recruiter", label: "A recruiter doing their job", icon: <span style={{ fontSize: 18 }}>💼</span> },
  { id: "friend",    label: "A friend who has heard this 100 times", icon: <TbPlayerEject size={20} /> },
  { id: "michael",  label: "Michael Scott, World's Best Boss", icon: <GiPartyHat size={20} /> },
  { id: "chris",    label: "Christopher Moltisanti", icon: <GiRevolver size={20} /> },
];

export default function PersonaSelector({ onSelect }: Props) {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "32px 0 24px" }}>
      <p
        style={{
          fontSize: 13,
          color: "var(--metal-dark)",
          marginBottom: 6,
          fontWeight: 500,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Chat with Mathan Perl
      </p>
      <p
        style={{
          fontSize: 20,
          color: "var(--chrome-shine)",
          marginBottom: 6,
          fontWeight: 600,
          letterSpacing: "-0.3px",
          lineHeight: 1.3,
        }}
      >
        Who am I speaking with?
      </p>
      <p
        style={{
          fontSize: 13,
          color: "var(--metal-mid)",
          marginBottom: 24,
          lineHeight: 1.5,
        }}
      >
        Ask me anything about Mathan: his experience, how he works, or what makes him different.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {personas.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 14,
              color: "var(--text-secondary)",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
              transition: "all 120ms ease",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "var(--chip-bg)";
              el.style.borderColor = "var(--header-btn-border)";
              el.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "var(--bg-surface)";
              el.style.borderColor = "var(--border-subtle)";
              el.style.color = "var(--text-secondary)";
            }}
          >
            <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{p.icon}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
