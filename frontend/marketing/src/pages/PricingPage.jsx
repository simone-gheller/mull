import { useTheme, Btn, Badge, Card, FONTS } from '@vextis/ui';

const TIERS = [
  {
    name: "Free",
    price: "free",
    sub: "forever",
    features: ["3 members", "3 apps", "5 environments", "100 values", "7-day audit log"],
    cta: "get started",
    variant: "secondary",
  },
  {
    name: "Team",
    price: "$49",
    sub: "/ month",
    features: ["5 members included", "25 apps", "Unlimited environments", "90-day audit log", "Custom roles"],
    cta: "start trial",
    variant: "primary",
    highlight: true,
  },
  {
    name: "Business",
    price: "$149",
    sub: "/ month",
    features: ["15 members included", "100 apps", "1-year audit log", "Advanced RBAC", "Priority support"],
    cta: "start trial",
    variant: "primary",
  },
  {
    name: "Enterprise",
    price: "custom",
    sub: "contact us",
    features: ["Everything in Business", "SAML and SCIM", "Audit export", "Custom retention", "Dedicated support"],
    cta: "talk to us",
    variant: "terminal",
  },
];

export function PricingPage({ onNavigate }) {
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
                color: page === "pricing" ? T.textPrimary : T.textMuted,
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
          // pricing
        </div>
        <h1 style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: "40px", color: T.textPrimary, letterSpacing: "-0.03em", marginBottom: "12px" }}>
          Simple, predictable pricing.
        </h1>
        <p style={{ fontFamily: FONTS.display, fontSize: "15px", color: T.textSecondary, marginBottom: "56px", lineHeight: 1.6 }}>
          Start free. Upgrade when your team grows.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {TIERS.map(tier => (
            <Card
              key={tier.name}
              T={T}
              title={tier.name}
              accent={tier.highlight ? "green" : undefined}
              style={{ position: "relative" }}
            >
              {tier.highlight && (
                <div style={{ position: "absolute", top: "-1px", right: "16px" }}>
                  <Badge T={T} variant="success">popular</Badge>
                </div>
              )}
              <div style={{ marginBottom: "20px" }}>
                <span style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: "28px", color: T.textPrimary, letterSpacing: "-0.02em" }}>
                  {tier.price}
                </span>
                <span style={{ fontFamily: FONTS.mono, fontSize: "11px", color: T.textMuted, marginLeft: "4px" }}>
                  {tier.sub}
                </span>
              </div>
              <ul style={{ listStyle: "none", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {tier.features.map(f => (
                  <li key={f} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <span style={{ color: T.termGreen, fontFamily: FONTS.mono, fontSize: "11px", flexShrink: 0, marginTop: "1px" }}>✓</span>
                    <span style={{ fontFamily: FONTS.display, fontSize: "13px", color: T.textSecondary, lineHeight: 1.4 }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Btn T={T} variant={tier.variant} size="sm">{tier.cta}</Btn>
            </Card>
          ))}
        </div>

        <div style={{ marginTop: "48px", padding: "24px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "6px" }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: "11px", color: T.textSecondary, textAlign: "center" }}>
            All plans include <span style={{ color: T.textPrimary }}>AES-256-GCM encryption</span>,{" "}
            <span style={{ color: T.textPrimary }}>99.9% uptime SLA</span>, and{" "}
            <span style={{ color: T.textPrimary }}>SOC 2 Type I</span> compliance.
          </div>
        </div>
      </div>
    </div>
  );
}
