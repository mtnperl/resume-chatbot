"use client";

import RoleFitAnalyzer from "@/components/RoleFitAnalyzer";

type Props = {
  open: boolean;
  onClose: () => void;
  onChipClick: (q: string) => void;
  onContact: () => void;
  isLoading: boolean;
  atMessageLimit: boolean;
  questions: string[];
};

export default function MobileDrawer({
  open,
  onClose,
  onChipClick,
  onContact,
  isLoading,
  atMessageLimit,
  questions,
}: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(4px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 220ms ease",
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          width: 300,
          display: "flex",
          flexDirection: "column",
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border-r)",
          boxShadow: "4px 0 32px rgba(0,0,0,0.18)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        {/* Drawer header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid var(--header-border)",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--chrome-shine)" }}>
            Menu
          </span>
          <button
            onClick={onClose}
            style={{
              color: "var(--metal-mid)",
              fontSize: 18,
              lineHeight: 1,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 6px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Identity card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "24px 24px 16px",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              overflow: "hidden",
              marginBottom: 12,
            }}
          >
            <img
              src="/profile_mathan.jpg"
              alt="Mathan Perl"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
            />
          </div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--chrome-shine)",
              letterSpacing: "-0.3px",
              textAlign: "center",
            }}
          >
            Mathan Perl
          </h2>
          <p style={{ fontSize: 13, color: "var(--metal-mid)", marginTop: 3, textAlign: "center" }}>
            Senior Partnerships Manager
          </p>
          <p style={{ fontSize: 12, color: "var(--metal-dark)", textAlign: "center" }}>
            Unity · New York
          </p>
          <div
            style={{ marginTop: 16, width: "100%", height: 1, background: "var(--divider-bg)" }}
          />
        </div>

        {/* Suggested questions */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 14px" }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--metal-dark)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 10,
              paddingLeft: 6,
            }}
          >
            Ask me
          </p>
          {!atMessageLimit &&
            questions.map((q) => (
              <button
                key={q}
                onClick={() => {
                  onChipClick(q);
                  onClose();
                }}
                disabled={isLoading}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  marginBottom: 7,
                  background: "var(--chip-bg)",
                  border: "1px solid var(--chip-border)",
                  borderRadius: 12,
                  fontSize: 13,
                  color: "var(--metal-mid)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  opacity: isLoading ? 0.4 : 1,
                }}
              >
                {q}
              </button>
            ))}
        </div>

        {/* Bottom actions */}
        <div
          style={{
            padding: "14px 14px",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
            borderTop: "1px solid var(--header-border)",
          }}
        >
          <button
            onClick={() => {
              onContact();
              onClose();
            }}
            style={{
              width: "100%",
              padding: "11px",
              borderRadius: 12,
              background: "var(--send-bg)",
              boxShadow: "var(--send-shadow)",
              color: "white",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
              fontFamily: "inherit",
            }}
          >
            Get in touch
          </button>
          <div style={{ marginTop: 8 }}>
            <RoleFitAnalyzer fullWidth />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {[
              { label: "LinkedIn", href: "https://www.linkedin.com/in/mathan-perl-9b442076/" },
              { label: "Resume", href: "/resume.pdf" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "9px",
                  borderRadius: 12,
                  fontSize: 13,
                  background: "var(--link-btn-bg)",
                  border: "1px solid var(--link-btn-border)",
                  color: "var(--metal-mid)",
                  textDecoration: "none",
                }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
