import { useState, useEffect } from 'react';
import { useTheme, Btn, Badge, Card, Stat, FONTS } from '@vextis/ui';
import TerminalHero from '../components/TerminalHero';

function useTypewriter(phrases, { typeSpeed = 36, eraseSpeed = 22, pause = 4000 } = {}) {
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState(reducedMotion ? phrases[0].length : 0);
  const [erasing, setErasing] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const phrase = phrases[idx];
    if (!erasing) {
      if (typed < phrase.length) {
        const t = setTimeout(() => setTyped(n => n + 1), typeSpeed);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setErasing(true), pause);
      return () => clearTimeout(t);
    } else {
      if (typed > 0) {
        const t = setTimeout(() => setTyped(n => n - 1), eraseSpeed);
        return () => clearTimeout(t);
      }
      setErasing(false);
      setIdx(i => (i + 1) % phrases.length);
      setTyped(0);
    }
  }, [typed, erasing, idx, reducedMotion]);

  return phrases[idx].slice(0, typed);
}

const HERO_PHRASES = [
  "for teams that ship.",
  "without the clipboard.",
  "for pipelines that scale.",
  "before it leaks.",
];

const FEAT_PHRASES = [
  "less sprawl, fewer surprises.",
  "built around the real mess.",
];

const PRICING_PHRASES = [
  "start free, scale when you grow.",
  "no surprises, ever.",
];

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

const FEATURES = [
  {
    eyebrow: "app inheritance",
    title: "Stop copying secrets between apps.",
    desc: "Define shared config once. Child apps inherit the baseline and override only what actually changes.",
    mockup: "inheritance",
  },
  {
    eyebrow: "flat pricing",
    title: "One team price. No seat-count theater.",
    desc: "Start free, then move the whole team onto a predictable monthly plan when secrets become shared infrastructure.",
    mockup: "pricing",
  },
  {
    eyebrow: "audit",
    title: "Know who touched production.",
    desc: "Every reveal, write, token, and rollback leaves a trail with actor, scope, and environment.",
    mockup: "audit",
  },
];

function FeatureMockup({ type, T }) {
  const mono = { fontFamily: FONTS.mono, fontSize: "11px", lineHeight: 1.7 };

  if (type === "inheritance") {
    const apps = [
      { name: "common", level: 0, open: true, active: false, branch: true },
      { name: "identity-service", level: 1, open: false, active: true, branch: false },
      { name: "commerce", level: 0, open: true, active: false, branch: true },
      { name: "billing-api", level: 1, open: true, active: false, branch: true },
      { name: "invoice-worker", level: 2, open: false, active: false, branch: false },
    ];

    return (
      <div style={{
        border: `1px solid ${T.border}`, borderRadius: "8px", overflow: "hidden",
        background: T.bg, boxShadow: "0 18px 60px rgba(0,0,0,0.22)",
        maxWidth: "470px", margin: "0 auto",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", borderBottom: `1px solid ${T.border}`, background: T.surface,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: "16px", color: T.termGreen, lineHeight: 1 }}>//</span>
            <span style={{
              fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted,
              letterSpacing: "0.22em", textTransform: "uppercase",
            }}>
              apps
            </span>
          </div>
          <span style={{
            fontFamily: FONTS.mono, fontSize: "10px", color: T.termGreen,
            border: `1px solid ${T.termGreen}`, borderRadius: "4px",
            padding: "3px 8px", background: "rgba(34,197,94,0.07)",
          }}>
            5
          </span>
        </div>

        <div style={{ padding: "16px 18px 6px", minHeight: "196px" }}>
          {apps.map(app => (
            <div key={app.name} style={{
              position: "relative",
              display: "grid", gridTemplateColumns: "24px 12px minmax(0, 1fr)", alignItems: "center", columnGap: "11px",
              marginLeft: `${app.level * 38}px`, marginBottom: "10px",
              padding: app.active ? "8px 12px" : "0 12px",
              borderRadius: "7px", background: app.active ? "rgba(34,197,94,0.09)" : "transparent",
              boxShadow: app.active ? `inset 3px 0 0 ${T.termGreen}` : "none",
            }}>
              {app.level > 0 && (
                <span style={{
                  position: "absolute", left: "-20px", top: "-18px", width: "1px",
                  height: app.level === 2 ? "42px" : "34px", background: T.border,
                }} />
              )}
              {app.open ? (
                <span style={{
                  width: "24px", height: "24px", borderRadius: "5px",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: T.elevated, border: `1px solid ${T.border}`,
                  color: T.textMuted, fontSize: "11px", flexShrink: 0,
                }}>
                  ▾
                </span>
              ) : (
                <span style={{
                  width: "24px", height: "24px", borderRadius: "5px",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: T.elevated, border: `1px solid ${T.border}`,
                  color: T.textMuted, fontSize: "12px", flexShrink: 0,
                }}>
                  ≡
                </span>
              )}
              <span style={{
                width: app.branch ? "10px" : "9px", height: app.branch ? "10px" : "9px",
                border: `1px solid ${T.termGreen}`, transform: app.branch ? "none" : "rotate(45deg)",
                background: app.active ? "rgba(34,197,94,0.35)" : "rgba(34,197,94,0.12)",
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: FONTS.mono, fontSize: "15px", fontWeight: 700,
                color: T.textPrimary, letterSpacing: "-0.035em",
                minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {app.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "pricing") {
    return (
      <div style={{ ...mono, display: "grid", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <span style={{ fontFamily: FONTS.display, fontSize: "34px", fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.03em" }}>$46</span>
          <span style={{ color: T.textMuted }}>/ month</span>
        </div>
        {["15 members included", "unlimited environments", "no per-seat math"].map(item => (
          <div key={item} style={{ display: "flex", gap: "8px", color: T.textSecondary }}>
            <span style={{ color: T.termGreen }}>✓</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    );
  }

  const rows = [
    ["May 17, 13:04", "Sofia Chen", "parameter_value.reveal_current", "JWT_SECRET / prod", "SUCCESS"],
    ["May 17, 13:02", "deploy-bot", "config.fetch", "api / production", "SUCCESS"],
    ["May 17, 12:58", "Marco R.", "parameter_value.rollback", "STRIPE_SECRET_KEY", "SUCCESS"],
    ["May 17, 12:44", "unknown token", "parameter_value.update", "DATABASE_URL", "DENIED"],
  ];
  const outcomeVariant = {
    SUCCESS: T.termGreen,
    DENIED: "#f59e0b",
    FAILURE: "#ef4444",
  };

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: "4px", overflow: "hidden", minWidth: 0 }}>
      <div style={{
        ...mono,
        display: "grid", gridTemplateColumns: "112px 1fr 1.35fr 1fr 82px", gap: "12px",
        padding: "9px 12px", background: T.bg, borderBottom: `1px solid ${T.border}`,
        color: T.textMuted, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase",
      }}>
        <span>time</span><span>actor</span><span>action</span><span>target</span><span>outcome</span>
      </div>
      {rows.map(([time, actor, action, target, outcome]) => (
        <div key={`${time}-${action}`} style={{
          ...mono,
          display: "grid", gridTemplateColumns: "112px 1fr 1.35fr 1fr 82px", gap: "12px",
          alignItems: "center", padding: "10px 12px", borderBottom: `1px solid ${T.border}`,
          background: T.bg,
        }}>
          <span style={{ color: T.textMuted, whiteSpace: "nowrap" }}>{time}</span>
          <span style={{ color: T.textSecondary, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{actor}</span>
          <span style={{ color: T.textPrimary, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{action}</span>
          <span style={{ color: T.textSecondary, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{target}</span>
          <span style={{
            color: outcomeVariant[outcome], border: `1px solid ${outcomeVariant[outcome]}`,
            borderRadius: "999px", padding: "2px 7px", fontSize: "10px", textAlign: "center",
            background: outcome === "SUCCESS" ? "rgba(34,197,94,0.07)" : "rgba(245,158,11,0.07)",
          }}>
            {outcome.toLowerCase()}
          </span>
        </div>
      ))}
    </div>
  );
}


export function HomePage({ onNavigate }) {
  const { T } = useTheme();
  const heroText = useTypewriter(HERO_PHRASES);
  const featText = useTypewriter(FEAT_PHRASES, { typeSpeed: 40, eraseSpeed: 25, pause: 3500 });
  const pricingText = useTypewriter(PRICING_PHRASES, { typeSpeed: 38, eraseSpeed: 24, pause: 3800 });

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.textPrimary }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        .hero-cursor {
          display: inline-block; width: 3px; height: 1em;
          background: #f5f7fa; margin-left: 2px; vertical-align: -0.15em;
          animation: cursorBlink 0.75s step-end infinite;
        }
        @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @media (prefers-reduced-motion: reduce) { .hero-cursor { animation: none; opacity: 1; } }
        .feature-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .feature-block { transition: border-color 0.16s ease, transform 0.16s ease; }
        .feature-block:hover { transform: translateY(-2px); }
        .feature-inner { display: grid; grid-template-columns: minmax(260px, 0.82fr) minmax(420px, 1.18fr); gap: 28px; align-items: center; }
        .pricing-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        @media (max-width: 860px) {
          .feature-inner { grid-template-columns: 1fr; }
          .pricing-grid { grid-template-columns: 1fr; }
        }
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
            vextis
          </span>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {[
            { label: "docs",      href: DOCS_URL,     page: null },
            { label: "pricing",   href: "#pricing",   page: null },
            { label: "changelog", href: "#",           page: null },
          ].map(({ label, href, page }) => (
            <a
              key={label}
              href={href}
              onClick={page ? e => { e.preventDefault(); onNavigate?.(page); } : undefined}
              style={{
                fontFamily: FONTS.mono, fontSize: "11px", color: T.textMuted,
                padding: "6px 12px", borderRadius: "4px", textDecoration: "none",
                transition: "color 0.1s", cursor: "pointer",
              }}
            >
              {label}
            </a>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <a href={`${APP_URL}/login`} style={{ textDecoration: "none" }}>
            <Btn T={T} variant="secondary" size="sm">sign in</Btn>
          </a>
          <a href={`${APP_URL}/signup`} style={{ textDecoration: "none" }}>
            <Btn T={T} variant="primary" size="sm">get started →</Btn>
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "96px 32px 80px", maxWidth: "960px", margin: "0 auto", animation: "fadeUp 0.3s ease" }}>
        <div style={{ marginBottom: "20px" }}>
          <Badge T={T} variant="outline" pulse>open beta</Badge>
        </div>
        <h1 style={{
          fontFamily: FONTS.display, fontWeight: 700, fontSize: "56px",
          color: T.textPrimary, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: "20px",
        }}>
          Secrets management<br />
          <span style={{ color: T.textMuted, fontWeight: 400 }}>
            {heroText}
            <span className="hero-cursor" />
          </span>
        </h1>
        <p style={{
          fontFamily: FONTS.display, fontSize: "17px", color: T.textSecondary,
          maxWidth: "500px", lineHeight: 1.65, fontWeight: 400, marginBottom: "36px",
        }}>
          vextis keeps your credentials encrypted, versioned, and scoped by environment — with a CLI that fits into any pipeline.
        </p>
        <div style={{ display: "flex", gap: "12px", marginBottom: "64px" }}>
          <a href={`${APP_URL}/signup`} style={{ textDecoration: "none" }}>
            <Btn T={T} variant="primary" size="lg">start for free →</Btn>
          </a>
          <a href={DOCS_URL} style={{ textDecoration: "none" }}>
            <Btn T={T} variant="terminal" size="lg" icon="❯">view docs</Btn>
          </a>
        </div>

        {/* Terminal demo */}
        <TerminalHero />
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "64px 32px", maxWidth: "960px", margin: "0 auto" }}>
        <div style={{
          fontFamily: FONTS.mono, fontSize: "10px", color: T.termGreen,
          letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "24px",
        }}>
          // features
        </div>

        {/* Section heading with typewriter */}
        <div style={{ marginBottom: "48px" }}>
          <h2 style={{
            fontFamily: FONTS.display, fontWeight: 700, fontSize: "38px",
            color: T.textPrimary, letterSpacing: "-0.03em", lineHeight: 1.1,
          }}>
            Built for developers.<br />
            <span style={{ color: T.textMuted, fontWeight: 400 }}>
              {featText}
              <span className="hero-cursor" />
            </span>
          </h2>
        </div>

        <div className="feature-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="feature-block" style={{
              padding: "24px", background: T.surface,
              border: `1px solid ${T.border}`, borderRadius: "8px",
            }}>
              <div className="feature-inner">
                <div>
                  <div style={{
                    fontFamily: FONTS.mono, fontSize: "10px", color: T.termGreen,
                    letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "14px",
                  }}>
                    {f.eyebrow}
                  </div>
                  <h3 style={{
                    fontFamily: FONTS.display, fontWeight: 700, fontSize: "28px",
                    color: T.textPrimary, letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: "12px",
                  }}>
                    {f.title}
                  </h3>
                  <p style={{
                    fontFamily: FONTS.display, fontSize: "14px", color: T.textSecondary,
                    lineHeight: 1.65, fontWeight: 400, maxWidth: "360px",
                  }}>
                    {f.desc}
                  </p>
                </div>

                <div style={{
                  padding: "14px", background: T.elevated,
                  border: `1px solid ${T.border}`, borderRadius: "6px", minWidth: 0, overflow: "hidden",
                }}>
                  <FeatureMockup type={f.mockup} T={T} />
                </div>
              </div>
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
          <Stat T={T} label="Teams using vextis" value="480+" />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: "64px 32px", maxWidth: "960px", margin: "0 auto" }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.termGreen, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "24px" }}>
          // pricing
        </div>
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{
            fontFamily: FONTS.display, fontWeight: 700, fontSize: "38px",
            color: T.textPrimary, letterSpacing: "-0.03em", lineHeight: 1.1,
          }}>
            Simple, predictable pricing.<br />
            <span style={{ color: T.textMuted, fontWeight: 400 }}>
              {pricingText}
              <span className="hero-cursor" />
            </span>
          </h2>
        </div>
        <div className="pricing-grid">
          {TIERS.map(tier => (
            <Card key={tier.name} T={T} title={tier.name} accent={tier.highlight ? "green" : undefined} style={{ position: "relative" }}>
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
        <div style={{ marginTop: "24px", padding: "20px 24px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "6px" }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: "11px", color: T.textSecondary, textAlign: "center" }}>
            All active plans include <span style={{ color: T.textPrimary }}>AES-256-GCM encryption</span>,{" "}
            <span style={{ color: T.textPrimary }}>CLI access</span>, and{" "}
            <span style={{ color: T.textPrimary }}>scoped access keys</span>. SSO, SAML, and SOC 2 are coming with Enterprise.
          </div>
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
            Start in 2 minutes. No credit card.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
            <a href={`${APP_URL}/signup`} style={{ textDecoration: "none" }}>
              <Btn T={T} variant="primary" size="lg">create free account →</Btn>
            </a>
            <a href={DOCS_URL} style={{ textDecoration: "none" }}>
              <Btn T={T} variant="secondary" size="lg">read the docs</Btn>
            </a>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${T.border}`, padding: "28px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        maxWidth: "960px", margin: "0 auto",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <div style={{
              width: "18px", height: "18px", borderRadius: "3px",
              background: T.elevated, border: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "10px", color: T.textPrimary,
            }}>▣</div>
            <span style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: "13px", color: T.textPrimary }}>vextis</span>
          </div>
          <span style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted }}>
            © 2026 vextis. All rights reserved.
          </span>
        </div>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          {[
            { label: "docs",    href: DOCS_URL },
            { label: "pricing", href: "#pricing" },
            { label: "privacy", href: "#" },
            { label: "status",  href: "#" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              style={{
                fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted,
                textDecoration: "none", letterSpacing: "0.05em",
                transition: "color 0.12s", cursor: "pointer",
              }}
              onMouseEnter={e => e.currentTarget.style.color = T.textSecondary}
              onMouseLeave={e => e.currentTarget.style.color = T.textMuted}
            >
              {label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
