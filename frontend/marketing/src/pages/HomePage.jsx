import { useTheme, Btn, Badge, Card, Stat, TermBlock, FONTS } from '@mull/ui';

const FEATURES = [
  {
    glyph: "◈",
    title: "Envelope encryption",
    desc: "Every secret encrypted with a unique DEK, wrapped by your KEK. Zero plaintext at rest.",
  },
  {
    glyph: "▣",
    title: "Environment isolation",
    desc: "Production, staging, dev — each with its own values. Inheritance lets child apps override without duplication.",
  },
  {
    glyph: "◇",
    title: "Audit log",
    desc: "Every read and write is logged with actor, timestamp, and diff. Know exactly who touched what.",
  },
  {
    glyph: "▷",
    title: "CLI-first",
    desc: "Push, pull, and rotate secrets from your terminal. The dashboard is for your team; the CLI is for your pipeline.",
  },
  {
    glyph: "⊙",
    title: "Role-based access",
    desc: "OWNER → ADMIN → USER hierarchy. Scope tokens to specific apps and environments.",
  },
  {
    glyph: "≡",
    title: "Version history",
    desc: "Every change is versioned. Roll back a secret to any previous value in one command.",
  },
];

const TERMINAL_LINES = [
  {
    cmd: "mull secrets push --env production",
    out: <div style={{ lineHeight: 1.8 }}>
      <div style={{ color: "#8a95a8" }}>Pushing 3 secrets to production…</div>
      <div><span style={{ color: "#22c55e" }}>✓</span> DATABASE_URL updated</div>
      <div><span style={{ color: "#22c55e" }}>✓</span> JWT_SECRET rotated</div>
      <div><span style={{ color: "#22c55e" }}>✓</span> STRIPE_SECRET_KEY synced</div>
      <div style={{ color: "#8a95a8" }}>Done in 340ms</div>
    </div>,
  },
  {
    cmd: "mull secrets get JWT_SECRET --reveal",
    out: <span style={{ color: "#f59e0b" }}>eyJhbGciOiJIUzI1NiJ9.Zm9v...</span>,
  },
];

export function HomePage() {
  const { T } = useTheme();

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.textPrimary }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
      `}</style>

      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        padding: "0 32px", height: "52px",
        display: "flex", alignItems: "center", gap: "24px",
        backdropFilter: "blur(8px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "9px", flex: 1 }}>
          <div style={{
            width: "26px", height: "26px", borderRadius: "5px",
            background: T.elevated, border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "13px", color: T.textPrimary,
          }}>▣</div>
          <span style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: "16px", color: T.textPrimary, letterSpacing: "-0.01em" }}>
            mull
          </span>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {["docs", "pricing", "changelog"].map(item => (
            <a key={item} href={`#${item}`} style={{
              fontFamily: FONTS.mono, fontSize: "11px", color: T.textMuted,
              padding: "6px 12px", borderRadius: "4px", textDecoration: "none",
              transition: "color 0.1s",
            }}>
              {item}
            </a>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Btn T={T} variant="secondary" size="sm">sign in</Btn>
          <Btn T={T} variant="primary" size="sm">get started →</Btn>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "96px 32px 80px", maxWidth: "960px", margin: "0 auto", animation: "fadeUp 0.3s ease" }}>
        <div style={{ marginBottom: "20px" }}>
          <Badge T={T} variant="success" pulse>open beta</Badge>
        </div>
        <h1 style={{
          fontFamily: FONTS.display, fontWeight: 700, fontSize: "56px",
          color: T.textPrimary, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: "20px",
        }}>
          Secrets management<br />
          <span style={{ color: T.textMuted, fontWeight: 400 }}>for teams that ship.</span>
        </h1>
        <p style={{
          fontFamily: FONTS.display, fontSize: "17px", color: T.textSecondary,
          maxWidth: "500px", lineHeight: 1.65, fontWeight: 400, marginBottom: "36px",
        }}>
          Mull keeps your credentials encrypted, versioned, and scoped by environment — with a CLI that fits into any pipeline.
        </p>
        <div style={{ display: "flex", gap: "12px", marginBottom: "64px" }}>
          <Btn T={T} variant="primary" size="lg">start for free →</Btn>
          <Btn T={T} variant="terminal" size="lg" icon="❯">view docs</Btn>
        </div>

        {/* Terminal demo */}
        <TermBlock T={T} lines={TERMINAL_LINES} />
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "64px 32px", maxWidth: "960px", margin: "0 auto" }}>
        <div style={{
          fontFamily: FONTS.mono, fontSize: "10px", color: T.termGreen,
          letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "40px",
        }}>
          // features
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              padding: "24px", background: T.surface,
              border: `1px solid ${T.border}`, borderRadius: "6px",
            }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: "22px", color: T.termGreen, marginBottom: "12px", opacity: 0.7 }}>{f.glyph}</div>
              <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: "14px", color: T.textPrimary, marginBottom: "8px" }}>{f.title}</div>
              <div style={{ fontFamily: FONTS.display, fontSize: "13px", color: T.textSecondary, lineHeight: 1.6, fontWeight: 400 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: "64px 32px", maxWidth: "960px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          <Stat T={T} label="Secrets managed" value="1.2M" sub="across all orgs" />
          <Stat T={T} label="Uptime" value="99.9%" sub="last 90 days" />
          <Stat T={T} label="Avg push latency" value="210ms" />
          <Stat T={T} label="Teams using Mull" value="480+" />
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 32px 96px", maxWidth: "960px", margin: "0 auto", textAlign: "center" }}>
        <Card T={T} style={{ padding: "48px" }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.termGreen, letterSpacing: "0.15em", marginBottom: "16px" }}>
            // get started today
          </div>
          <h2 style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: "32px", color: T.textPrimary, letterSpacing: "-0.02em", marginBottom: "12px" }}>
            Ready to ship securely?
          </h2>
          <p style={{ fontFamily: FONTS.display, fontSize: "15px", color: T.textSecondary, marginBottom: "28px", lineHeight: 1.6 }}>
            Free plan includes 3 apps, unlimited environments, and full CLI access.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
            <Btn T={T} variant="primary" size="lg">create free account →</Btn>
            <Btn T={T} variant="secondary" size="lg">read the docs</Btn>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${T.border}`, padding: "24px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted }}>
          © 2026 Mull. All rights reserved.
        </span>
        <span style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted }}>
          Built with ▣ and JetBrains Mono
        </span>
      </footer>
    </div>
  );
}
