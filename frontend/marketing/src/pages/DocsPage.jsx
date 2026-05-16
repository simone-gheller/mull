import { useTheme, Card, Btn, Badge, FONTS } from '@vextis/ui';

const SECTIONS = [
  { icon: "▷", title: "Quick start", desc: "Install the CLI, authenticate, and push your first secret in under 5 minutes." },
  { icon: "◈", title: "Concepts", desc: "Learn about apps, environments, parameters, and how envelope encryption works." },
  { icon: "≡", title: "CLI reference", desc: "Full reference for every mull command, flag, and environment variable." },
  { icon: "◇", title: "API reference", desc: "REST API documentation with request/response examples and authentication." },
  { icon: "▣", title: "Integrations", desc: "GitHub Actions, Docker, Kubernetes, Vercel, and more." },
  { icon: "⊙", title: "Security model", desc: "Deep dive into the cryptographic model, key rotation, and audit logging." },
];

export function DocsPage({ onNavigate }) {
  const { T } = useTheme();

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.textPrimary }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        padding: "0 32px", height: "52px",
        display: "flex", alignItems: "center", gap: "24px",
        backdropFilter: "blur(8px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "9px", flex: 1 }}>
          <a
            href="#"
            onClick={e => { e.preventDefault(); onNavigate?.('home'); }}
            style={{ display: "flex", alignItems: "center", gap: "9px", textDecoration: "none" }}
          >
            <div style={{
              width: "26px", height: "26px", borderRadius: "5px",
              background: T.elevated, border: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px", color: T.textPrimary,
            }}>▣</div>
            <span style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: "16px", color: T.textPrimary, letterSpacing: "-0.01em" }}>
              mull
            </span>
          </a>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {[
            { label: "docs",    page: "docs" },
            { label: "pricing", page: "pricing" },
          ].map(({ label, page }) => (
            <a
              key={label}
              href="#"
              onClick={e => { e.preventDefault(); onNavigate?.(page); }}
              style={{
                fontFamily: FONTS.mono, fontSize: "11px",
                color: page === "docs" ? T.textPrimary : T.textMuted,
                padding: "6px 12px", borderRadius: "4px", textDecoration: "none",
                transition: "color 0.1s", cursor: "pointer",
              }}
            >
              {label}
            </a>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Btn T={T} variant="secondary" size="sm">sign in</Btn>
          <Btn T={T} variant="primary" size="sm">get started →</Btn>
        </div>
      </nav>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "80px 32px" }}>

        <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.termGreen, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "16px" }}>
          // documentation
        </div>
        <h1 style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: "40px", color: T.textPrimary, letterSpacing: "-0.03em", marginBottom: "12px" }}>
          Docs
        </h1>
        <p style={{ fontFamily: FONTS.display, fontSize: "15px", color: T.textSecondary, marginBottom: "48px", lineHeight: 1.6 }}>
          Everything you need to integrate Mull into your workflow.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "48px" }}>
          {SECTIONS.map(s => (
            <Card key={s.title} T={T} style={{ cursor: "pointer" }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: "18px", color: T.termGreen, marginBottom: "10px", opacity: 0.7 }}>{s.icon}</div>
              <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: "14px", color: T.textPrimary, marginBottom: "6px" }}>{s.title}</div>
              <div style={{ fontFamily: FONTS.display, fontSize: "13px", color: T.textSecondary, lineHeight: 1.6, fontWeight: 400 }}>{s.desc}</div>
            </Card>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "20px 24px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "6px" }}>
          <Badge T={T} variant="warning">coming soon</Badge>
          <span style={{ fontFamily: FONTS.display, fontSize: "13px", color: T.textSecondary }}>
            Full documentation is in progress. Join the beta to get early access and help shape the docs.
          </span>
          <div style={{ marginLeft: "auto" }}>
            <Btn T={T} variant="primary" size="sm">join beta →</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
