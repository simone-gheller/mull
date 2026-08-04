import { useTheme, Btn, Badge, Card, FONTS } from '@vextis/ui';

const APP_URL = import.meta.env.VITE_APP_URL
  || (import.meta.env.DEV ? 'http://localhost:5173' : 'https://app.vextis.io');
const DOCS_URL = import.meta.env.VITE_DOCS_URL
  || (import.meta.env.DEV ? 'http://localhost:5175' : 'https://docs.vextis.io');

const TIERS = [
  {
    name: "Free",
    price: "free",
    sub: "forever",
    blurb: "For solo developers and small beta projects.",
    features: ["3 members", "3 apps", "5 environments", "CLI and dashboard access", "7-day audit log"],
    cta: "get started",
    variant: "secondary",
  },
  {
    name: "Team",
    price: "$46",
    sub: "/ month",
    blurb: "One flat price for the team shipping real systems.",
    features: ["15 members included", "Unlimited environments", "App inheritance", "Scoped service tokens", "90-day audit log"],
    cta: "start team",
    variant: "primary",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "soon",
    sub: "design partners",
    blurb: "For regulated teams that need procurement-ready controls.",
    features: ["SAML SSO", "SOC 2", "SCIM provisioning", "Audit export", "Custom retention"],
    cta: "join waitlist",
    variant: "terminal",
    soon: true,
  },
];

export function PricingPage({ onNavigate }) {
  const { T } = useTheme();

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.textPrimary }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .pricing-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        @media (max-width: 860px) { .pricing-grid { grid-template-columns: 1fr; } }
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
              vextis
            </span>
          </a>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {[
            { label: "docs",    href: DOCS_URL },
            { label: "pricing", href: "#", page: "pricing" },
          ].map(({ label, href, page }) => (
            <a
              key={label}
              href={href}
              onClick={page ? e => { e.preventDefault(); onNavigate?.(page); } : undefined}
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
          <a href={`${APP_URL}/login`} style={{ textDecoration: "none" }}><Btn T={T} variant="secondary" size="sm">sign in</Btn></a>
          <a href={`${APP_URL}/signup`} style={{ textDecoration: "none" }}><Btn T={T} variant="primary" size="sm">get started →</Btn></a>
        </div>
      </nav>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "80px 32px" }}>

        <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.termGreen, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "16px" }}>
          // pricing
        </div>
        <h1 style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: "40px", color: T.textPrimary, letterSpacing: "-0.03em", marginBottom: "12px" }}>
          Flat pricing for teams that hate seat math.
        </h1>
        <p style={{ fontFamily: FONTS.display, fontSize: "15px", color: T.textSecondary, marginBottom: "56px", lineHeight: 1.6 }}>
          Start free. Upgrade to one team plan when secrets become shared infrastructure.
        </p>

        <div className="pricing-grid">
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
              {tier.soon && (
                <div style={{ position: "absolute", top: "-1px", right: "16px" }}>
                  <Badge T={T} variant="warning">soon</Badge>
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
              <p style={{ fontFamily: FONTS.display, fontSize: "13px", color: T.textSecondary, lineHeight: 1.55, marginBottom: "18px", minHeight: "40px" }}>
                {tier.blurb}
              </p>
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
            All active plans include <span style={{ color: T.textPrimary }}>AES-256-GCM encryption</span>,{" "}
            <span style={{ color: T.textPrimary }}>CLI access</span>, and{" "}
            <span style={{ color: T.textPrimary }}>scoped access keys</span>. SSO, SAML, and SOC 2 are coming with Enterprise.
          </div>
        </div>
      </div>
    </div>
  );
}
