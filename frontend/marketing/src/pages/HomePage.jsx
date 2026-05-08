import { useState, useEffect } from 'react';
import { useTheme, Btn, Badge, Card, Stat, FONTS } from '@mull/ui';
import TerminalHero from '../components/TerminalHero';

const TIERS = [
  {
    name: "Hobby",
    price: "free",
    sub: "forever",
    features: ["3 apps", "Unlimited environments", "CLI access", "7-day audit log", "Community support"],
    cta: "get started",
    variant: "secondary",
  },
  {
    name: "Starter",
    price: "$12",
    sub: "/ month",
    features: ["10 apps", "Unlimited environments", "CLI access", "30-day audit log", "Email support", "Access tokens"],
    cta: "start trial",
    variant: "primary",
    highlight: true,
  },
  {
    name: "Team",
    price: "$49",
    sub: "/ month",
    features: ["Unlimited apps", "Unlimited environments", "CLI access", "90-day audit log", "Priority support", "SAML SSO", "Custom roles"],
    cta: "start trial",
    variant: "primary",
  },
  {
    name: "Growth",
    price: "custom",
    sub: "contact us",
    features: ["Everything in Team", "Dedicated infra", "SLA guarantee", "SOC 2 Type II", "Audit export", "White-glove onboarding"],
    cta: "talk to us",
    variant: "terminal",
  },
];

const PHRASES = [
  "for teams that ship.",
  "without the clipboard.",
  "for pipelines that scale.",
  "before it leaks.",
];

const FEATURES = [
  {
    glyph: "◈",
    title: "Envelope encryption",
    desc: "Every secret encrypted with a unique DEK, wrapped by your KEK. Zero plaintext at rest.",
  },
  {
    glyph: "▷",
    title: "CLI-first",
    desc: "Push, pull, and rotate secrets from your terminal. The dashboard is for your team; the CLI is for your pipeline.",
  },
  {
    glyph: "≡",
    title: "Audit log",
    desc: "Every read and write is logged with actor, timestamp, and diff. Know exactly who touched what.",
  },
  {
    glyph: "◈",
    title: "Environment isolation",
    desc: "Production, staging, dev — each with its own values. Inheritance lets child apps override without duplication.",
  },
  {
    glyph: "▷",
    title: "Role-based access",
    desc: "OWNER → ADMIN → USER hierarchy. Scope tokens to specific apps and environments.",
  },
  {
    glyph: "≡",
    title: "Version history",
    desc: "Every change is versioned. Roll back a secret to any previous value in one command.",
  },
];


export function HomePage({ onNavigate }) {
  const { T } = useTheme();
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [typed, setTyped]         = useState(reducedMotion ? PHRASES[0].length : 0);
  const [erasing, setErasing]     = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const phrase = PHRASES[phraseIdx];
    if (!erasing) {
      if (typed < phrase.length) {
        const t = setTimeout(() => setTyped(n => n + 1), 36);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setErasing(true), 4000);
      return () => clearTimeout(t);
    } else {
      if (typed > 0) {
        const t = setTimeout(() => setTyped(n => n - 1), 22);
        return () => clearTimeout(t);
      }
      setErasing(false);
      setPhraseIdx(i => (i + 1) % PHRASES.length);
      setTyped(0);
    }
  }, [typed, erasing, phraseIdx, reducedMotion]);

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
          {[
            { label: "docs",      href: "#docs",      page: "docs" },
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
          <Btn T={T} variant="secondary" size="sm">sign in</Btn>
          <Btn T={T} variant="primary" size="sm">get started →</Btn>
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
            {PHRASES[phraseIdx].slice(0, typed)}
            <span className="hero-cursor" />
          </span>
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
        <TerminalHero />
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

      {/* Pricing */}
      <section id="pricing" style={{ padding: "64px 32px", maxWidth: "960px", margin: "0 auto" }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.termGreen, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "16px" }}>
          // pricing
        </div>
        <h2 style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: "32px", color: T.textPrimary, letterSpacing: "-0.03em", marginBottom: "8px" }}>
          Simple, predictable pricing.
        </h2>
        <p style={{ fontFamily: FONTS.display, fontSize: "14px", color: T.textSecondary, marginBottom: "40px", lineHeight: 1.6 }}>
          Start free. Upgrade when your team grows.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {TIERS.map(tier => (
            <Card key={tier.name} T={T} title={tier.name} accent={tier.highlight ? "green" : undefined} style={{ position: "relative" }}>
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
        <div style={{ marginTop: "24px", padding: "20px 24px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "6px" }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: "11px", color: T.textSecondary, textAlign: "center" }}>
            All plans include <span style={{ color: T.textPrimary }}>AES-256-GCM encryption</span>,{" "}
            <span style={{ color: T.textPrimary }}>99.9% uptime SLA</span>, and{" "}
            <span style={{ color: T.textPrimary }}>SOC 2 Type I</span> compliance.
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
            <Btn T={T} variant="primary" size="lg">create free account →</Btn>
            <Btn T={T} variant="secondary" size="lg">read the docs</Btn>
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
            <span style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: "13px", color: T.textPrimary }}>mull</span>
          </div>
          <span style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted }}>
            © 2026 Mull. All rights reserved.
          </span>
        </div>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          {[
            { label: "docs",    href: "#docs" },
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
