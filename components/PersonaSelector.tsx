"use client";

type Props = {
  onSelect: (persona: string) => void;
};

const personas = [
  { id: "recruiter", emoji: "🎯", label: "A recruiter doing their job" },
  { id: "friend", emoji: "😅", label: "A friend who has heard this 100 times" },
  { id: "michael", emoji: "🏆", label: "Michael Scott, World's Best Boss" },
  { id: "chris", emoji: "🍝", label: "Christopher Moltisanti" },
];

export default function PersonaSelector({ onSelect }: Props) {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 0" }}>
      <p
        style={{
          fontSize: 15,
          color: "var(--text-primary)",
          marginBottom: 16,
          fontWeight: 500,
        }}
      >
        Before we get started — who am I speaking with?
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
            <span style={{ fontSize: 18 }}>{p.emoji}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
