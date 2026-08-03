import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme, Btn, Badge, FONTS } from '@vextis/ui';

const APP_URL = import.meta.env.VITE_APP_URL || 'https://app.vextis.io';
const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'https://vextis.io';
const INSTALL_COMMAND = 'curl -fsSL https://raw.githubusercontent.com/simone-gheller/mull/main/cli/scripts/install.sh | bash';

const DOC_GROUPS = [
  {
    title: 'Start',
    pages: [
      { id: 'overview', title: 'Overview', description: 'What vextis is and where to start.' },
      { id: 'quickstart', title: 'Quickstart', description: 'Get a local app running with managed config.' },
      { id: 'install-cli', title: 'Install CLI', description: 'Install and update the vextis CLI.' },
      { id: 'cli-login', title: 'CLI login', description: 'Authorize your terminal session.' },
    ],
  },
  {
    title: 'Core concepts',
    pages: [
      { id: 'apps', title: 'Apps', description: 'Deployable services and projects.' },
      { id: 'environments', title: 'Environments', description: 'Runtime targets like development and production.' },
      { id: 'parameters', title: 'Parameters', description: 'Encrypted config keys and values.' },
      { id: 'inheritance', title: 'Inheritance', description: 'Fallback behavior for unset values.' },
    ],
  },
  {
    title: 'Use',
    pages: [
      { id: 'config-pull', title: 'Pull config', description: 'Print resolved config as dotenv output.' },
      { id: 'run-with-env', title: 'Run with env', description: 'Inject config into a child process.' },
      { id: 'ci-cd', title: 'CI/CD', description: 'Use VEXTIS_TOKEN in automation.' },
    ],
  },
  {
    title: 'Security',
    pages: [
      { id: 'security-model', title: 'Security model', description: 'Encryption, authorization, and audit posture.' },
      { id: 'access-tokens', title: 'Access tokens', description: 'Personal and organization automation tokens.' },
      { id: 'audit-logs', title: 'Audit logs', description: 'Events recorded for sensitive actions.' },
    ],
  },
  {
    title: 'Reference',
    pages: [
      { id: 'cli-reference', title: 'CLI reference', description: 'Current command surface.' },
      { id: 'api-basics', title: 'API basics', description: 'REST API notes for automation.', badge: 'soon' },
      { id: 'sdks', title: 'SDKs', description: 'SDKs planned after CLI and API stabilize.', badge: 'soon' },
      { id: 'troubleshooting', title: 'Troubleshooting', description: 'Common setup and permission issues.' },
      { id: 'changelog', title: 'Changelog', description: 'Release notes and CLI versions.', badge: 'soon' },
    ],
  },
];

const ALL_PAGES = DOC_GROUPS.flatMap(group => group.pages.map(page => ({ ...page, group: group.title })));

const QUICKSTART_STEPS = [
  ['Install the CLI', INSTALL_COMMAND, 'vextis 0.1.x installed'],
  ['Sign in', 'vextis auth login', 'Authorized as ada@example.com'],
  ['Create resources', 'Open the dashboard and create app api, environment development, and parameter DATABASE_URL.', 'Ready in dashboard'],
  ['Link repo', 'vextis link', 'Linked api / development'],
  ['Set a value', 'vextis params set DATABASE_URL --app api --env development --value "postgres://localhost:5432/app"', 'DATABASE_URL updated'],
  ['Run app', 'vextis run --app api --env development -- npm run dev', 'Starting npm run dev'],
];

const CONCEPTS = [
  ['Apps', 'An app is a deployable service or project, such as api, web, or worker.'],
  ['Environments', 'An environment is a runtime target, such as development, staging, or production.'],
  ['Parameters', 'A parameter is a named config key. Values are encrypted and stored per environment.'],
  ['Inheritance', 'Unset local values fall back to parent config. Empty values are treated as unset.'],
];

const CLI_COMMANDS = [
  ['auth login', 'Sign in via browser device flow.'],
  ['auth whoami', 'Show the active authenticated actor.'],
  ['context', 'Show active org, app, and environment.'],
  ['link', 'Link this working tree to an app and environment.'],
  ['params list --app <name>', 'List parameter keys and state.'],
  ['params set <key> --app <name> --env <name>', 'Set a parameter value.'],
  ['config pull --app <name> --env <name>', 'Print resolved config as dotenv output.'],
  ['run --app <name> --env <name> -- <cmd>', 'Inject config into a child process.'],
  ['doctor', 'Check auth, connectivity, and local project config.'],
];

const TOKEN_SCOPES = [
  ['config:read', 'Read resolved config responses.'],
  ['config:reveal', 'Reveal plaintext values when allowed.'],
  ['config:write', 'Write config values.'],
  ['parameters:read', 'List parameter metadata.'],
  ['parameters:write', 'Create or update parameter values.'],
  ['apps:read', 'List apps.'],
  ['environments:read', 'List environments.'],
];

const TROUBLESHOOTING = [
  ['vextis command not found', 'Restart your shell or add the install directory to PATH.'],
  ['No active organization', 'Run vextis auth whoami, then sign in again if needed.'],
  ['No app or environment linked', 'Run vextis link from the repository root.'],
  ['Parameter not found', 'Create the parameter in the dashboard first.'],
  ['Permission denied', 'Check role permissions or token scopes. CI usually needs config:read and config:reveal.'],
];

function getInitialPageId() {
  const raw = window.location.hash.replace('#', '');
  return ALL_PAGES.some(page => page.id === raw) ? raw : 'overview';
}

function ComingSoonBadge({ T }) {
  return <Badge T={T} variant="default">soon</Badge>;
}

function PageTitle({ T, label, title, children }) {
  return (
    <header style={{ marginBottom: '26px' }}>
      <div style={{
        fontFamily: FONTS.mono,
        fontSize: '10px',
        color: T.termGreen,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        marginBottom: '10px',
      }}>
        {label}
      </div>
      <h1 style={{
        fontFamily: FONTS.display,
        fontSize: '38px',
        lineHeight: 1.08,
        letterSpacing: '-0.035em',
        color: T.textPrimary,
        marginBottom: '12px',
      }}>
        {title}
      </h1>
      {children && (
        <p style={{
          fontFamily: FONTS.display,
          fontSize: '15px',
          color: T.textSecondary,
          lineHeight: 1.75,
          maxWidth: '660px',
        }}>
          {children}
        </p>
      )}
    </header>
  );
}

function SmallHeading({ T, children }) {
  return (
    <h2 style={{
      fontFamily: FONTS.display,
      fontSize: '20px',
      letterSpacing: '-0.02em',
      color: T.textPrimary,
      marginBottom: '12px',
    }}>
      {children}
    </h2>
  );
}

function CommandBlock({ T, command, title = 'Shell' }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const fallbackCopy = () => {
      const textarea = document.createElement('textarea');
      textarea.value = command;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    };

    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(command);
        } catch {
          if (!fallbackCopy()) throw new Error('copy failed');
        }
      } else if (!fallbackCopy()) {
        throw new Error('copy failed');
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="command-block" style={{
      background: '#07090c',
      border: `1px solid ${T.border}`,
      borderRadius: '6px',
      overflow: 'hidden',
      minWidth: 0,
    }}>
      <div style={{
        height: '34px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px 0 12px',
      }}>
        <span style={{
          fontFamily: FONTS.mono,
          fontSize: '10px',
          color: T.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          {title}
        </span>
        <button
          type="button"
          onClick={copy}
          style={{
            background: 'transparent',
            border: `1px solid ${T.border}`,
            borderRadius: '4px',
            color: copied ? T.termGreen : T.textMuted,
            cursor: 'pointer',
            fontFamily: FONTS.mono,
            fontSize: '10px',
            padding: '4px 7px',
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: '14px 16px',
        overflowX: 'auto',
        fontFamily: FONTS.mono,
        fontSize: '12px',
        lineHeight: 1.7,
        color: T.textPrimary,
      }}>
        <code>{command}</code>
      </pre>
    </div>
  );
}

function OutputBlock({ T, children }) {
  return (
    <pre style={{
      margin: 0,
      background: T.bg,
      border: `1px solid ${T.border}`,
      borderRadius: '6px',
      padding: '11px 13px',
      overflowX: 'auto',
      fontFamily: FONTS.mono,
      fontSize: '12px',
      lineHeight: 1.6,
      color: T.textSecondary,
    }}>
      <code>{children}</code>
    </pre>
  );
}

function Callout({ T, children, type = 'info' }) {
  const tone = type === 'warning'
    ? { color: T.amber, border: T.amberBorder, bg: T.amberBg }
    : { color: T.termGreen, border: T.termGreenBorder, bg: T.termGreenBg };

  return (
    <div style={{
      border: `1px solid ${tone.border}`,
      borderLeft: `3px solid ${tone.color}`,
      background: tone.bg,
      borderRadius: '6px',
      padding: '13px 15px',
      fontFamily: FONTS.display,
      fontSize: '13px',
      lineHeight: 1.65,
      color: T.textSecondary,
    }}>
      {children}
    </div>
  );
}

function Card({ T, title, body, onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="doc-card"
      style={{
        textAlign: 'left',
        padding: '16px',
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: '6px',
        cursor: 'pointer',
        minHeight: '126px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start', marginBottom: '8px' }}>
        <h3 style={{ fontFamily: FONTS.display, fontSize: '15px', color: T.textPrimary }}>
          {title}
        </h3>
        {badge === 'soon' && <ComingSoonBadge T={T} />}
      </div>
      <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, lineHeight: 1.6 }}>
        {body}
      </p>
    </button>
  );
}

function SearchButton({ T, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Search docs"
      className="docs-search-button"
      style={{
        height: '34px',
        minWidth: '260px',
        borderRadius: '6px',
        border: `1px solid ${T.border}`,
        background: T.bg,
        color: T.textMuted,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        padding: '0 9px 0 12px',
        fontFamily: FONTS.mono,
        fontSize: '11px',
        cursor: 'pointer',
      }}
    >
      <span>Search docs...</span>
      <span style={{ border: `1px solid ${T.border}`, borderRadius: '4px', padding: '2px 5px', color: T.textDisabled }}>
        cmd+k
      </span>
    </button>
  );
}

function TopNav({ T, onSearchOpen, onMenuOpen }) {
  return (
    <nav className="docs-top-nav" style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
      <div className="docs-nav-inner">
        <a href={LANDING_URL} className="docs-brand" style={{ textDecoration: 'none' }}>
          <span style={{
            width: '28px',
            height: '28px',
            borderRadius: '5px',
            border: `1px solid ${T.border}`,
            background: T.elevated,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: T.termGreen,
            fontFamily: FONTS.mono,
            fontSize: '12px',
          }}>
            &gt;_
          </span>
          <span style={{ fontFamily: FONTS.display, fontWeight: 700, color: T.textPrimary, fontSize: '16px' }}>
            vextis
          </span>
        </a>
        <div className="docs-search-wrap">
          <SearchButton T={T} onOpen={onSearchOpen} />
        </div>
        <div className="docs-top-links">
          <a href="#overview">Docs</a>
          <a href="#api-basics">API</a>
          <a href="#changelog">Changelog</a>
        </div>
        <div className="docs-actions">
          <a href={`${APP_URL}/login`} style={{ textDecoration: 'none' }}><Btn T={T} variant="secondary" size="sm">Sign in</Btn></a>
          <a href={`${APP_URL}/signup`} style={{ textDecoration: 'none' }}><Btn T={T} variant="primary" size="sm">Get started</Btn></a>
        </div>
        <button
          type="button"
          className="docs-menu-button"
          onClick={onMenuOpen}
          style={{
            display: 'none',
            border: `1px solid ${T.border}`,
            background: 'transparent',
            color: T.textPrimary,
            borderRadius: '5px',
            fontFamily: FONTS.mono,
            fontSize: '11px',
            padding: '6px 9px',
          }}
        >
          menu
        </button>
      </div>
    </nav>
  );
}

function Sidebar({ T, activePageId, onSelect }) {
  return (
    <aside className="docs-sidebar" style={{ borderRight: `1px solid ${T.border}` }}>
      <div style={{
        fontFamily: FONTS.mono,
        fontSize: '10px',
        color: T.termGreen,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        marginBottom: '20px',
      }}>
        // docs
      </div>
      {DOC_GROUPS.map(group => (
        <div key={group.title} style={{ marginBottom: '22px' }}>
          <div style={{
            fontFamily: FONTS.mono,
            fontSize: '10px',
            color: T.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: '8px',
          }}>
            {group.title}
          </div>
          <div style={{ display: 'grid', gap: '2px' }}>
            {group.pages.map(page => {
              const active = page.id === activePageId;
              return (
                <a
                  key={page.id}
                  href={`#${page.id}`}
                  onClick={() => onSelect?.(page.id)}
                  className="docs-sidebar-link"
                  style={{
                    fontFamily: FONTS.display,
                    fontSize: '13px',
                    color: active ? T.textPrimary : T.textSecondary,
                    textDecoration: 'none',
                    padding: '6px 8px 6px 10px',
                    borderLeft: `2px solid ${active ? T.termGreen : 'transparent'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <span>{page.title}</span>
                  {page.badge === 'soon' && <ComingSoonBadge T={T} />}
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );
}

function MobileMenu({ T, open, activePageId, onClose, onSelect }) {
  if (!open) return null;

  return (
    <div className="docs-mobile-layer">
      <button type="button" className="docs-mobile-backdrop" aria-label="Close menu" onClick={onClose} />
      <div className="docs-mobile-panel" style={{ background: T.surface, borderRight: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px', borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontFamily: FONTS.display, fontWeight: 700, color: T.textPrimary }}>vextis docs</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: `1px solid ${T.border}`,
              borderRadius: '4px',
              color: T.textMuted,
              fontFamily: FONTS.mono,
              fontSize: '11px',
              padding: '5px 8px',
            }}
          >
            close
          </button>
        </div>
        <div style={{ padding: '18px' }}>
          <Sidebar T={T} activePageId={activePageId} onSelect={(id) => { onSelect(id); onClose(); }} />
        </div>
      </div>
    </div>
  );
}

function SearchDialog({ T, open, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_PAGES;
    return ALL_PAGES.filter(page => (
      page.title.toLowerCase().includes(q) ||
      page.description.toLowerCase().includes(q) ||
      page.group.toLowerCase().includes(q)
    ));
  }, [query]);

  if (!open) return null;

  return (
    <div className="docs-modal-layer">
      <button type="button" className="docs-modal-backdrop" aria-label="Close search" onClick={onClose} />
      <div className="docs-search-dialog" role="dialog" aria-modal="true" aria-label="Search docs" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontFamily: FONTS.mono, color: T.termGreen }}>/</span>
          <input
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search docs..."
            style={{
              flex: 1,
              border: 0,
              outline: 'none',
              background: 'transparent',
              color: T.textPrimary,
              fontFamily: FONTS.mono,
              fontSize: '13px',
            }}
          />
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: '4px', color: T.textMuted, fontFamily: FONTS.mono, fontSize: '10px', padding: '4px 7px' }}>
            esc
          </button>
        </div>
        <div style={{ maxHeight: '420px', overflow: 'auto', padding: '8px' }}>
          {results.map(page => (
            <a
              key={page.id}
              href={`#${page.id}`}
              onClick={() => { onSelect(page.id); onClose(); }}
              className="search-result"
              style={{ display: 'block', padding: '11px 12px', borderRadius: '6px', textDecoration: 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '3px' }}>
                <span style={{ fontFamily: FONTS.display, fontSize: '14px', color: T.textPrimary, fontWeight: 600 }}>{page.title}</span>
                <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen }}>{page.group}</span>
              </div>
              <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textMuted, lineHeight: 1.55 }}>{page.description}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function OverviewPage({ T, go }) {
  return (
    <>
      <PageTitle T={T} label="beta docs" title="vextis documentation">
        Secure app config for local development and CI. Model apps, environments, and parameters once; read them from the CLI when your code runs.
      </PageTitle>
      <div style={{ display: 'grid', gap: '20px' }}>
        <CommandBlock T={T} title="Start here" command={'vextis auth login\nvextis link\nvextis run --env development -- npm run dev'} />
        <Callout T={T}>
          New to vextis? Create your app, environment, and first parameter in the dashboard. Then use the CLI to link this repository and run your app.
        </Callout>
        <div className="card-grid">
          <Card T={T} title="Quickstart" body="The shortest path from empty repo to injected config." onClick={() => go('quickstart')} />
          <Card T={T} title="Core concepts" body="Apps, environments, parameters, and inheritance in one page." onClick={() => go('apps')} />
          <Card T={T} title="CI/CD" body="Use an organization token as VEXTIS_TOKEN in automation." onClick={() => go('ci-cd')} />
          <Card T={T} title="Security model" body="Encryption, scoped access, and audit trail basics." onClick={() => go('security-model')} />
        </div>
      </div>
    </>
  );
}

function QuickstartPage({ T }) {
  return (
    <>
      <PageTitle T={T} label="getting started" title="Quickstart">
        A compact setup path using only commands that exist in the current CLI.
      </PageTitle>
      <div style={{ display: 'grid', gap: '12px' }}>
        {QUICKSTART_STEPS.map(([title, command, output], index) => (
          <div key={title} className="step-row" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '6px', padding: '16px', display: 'grid', gridTemplateColumns: '38px minmax(0, 1fr)', gap: '14px' }}>
            <div style={{ fontFamily: FONTS.mono, color: T.termGreen, fontSize: '12px' }}>{String(index + 1).padStart(2, '0')}</div>
            <div style={{ display: 'grid', gap: '10px', minWidth: 0 }}>
              <h2 style={{ fontFamily: FONTS.display, fontSize: '16px', color: T.textPrimary }}>{title}</h2>
              {command.startsWith('vextis') || command.startsWith('curl') ? <CommandBlock T={T} command={command} /> : <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, lineHeight: 1.6 }}>{command}</p>}
              <OutputBlock T={T}>{output}</OutputBlock>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function InstallPage({ T }) {
  return (
    <>
      <PageTitle T={T} label="cli" title="Install CLI">
        Install the vextis CLI locally. The install URL still points to the current mull repository until the repo is renamed.
      </PageTitle>
      <CommandBlock T={T} command={INSTALL_COMMAND} />
      <div style={{ height: '14px' }} />
      <CommandBlock T={T} title="Check version" command="vextis version" />
    </>
  );
}

function LoginPage({ T }) {
  return (
    <>
      <PageTitle T={T} label="auth" title="CLI login">
        Authorize your terminal with the browser device flow.
      </PageTitle>
      <CommandBlock T={T} command="vextis auth login" />
      <div style={{ height: '14px' }} />
      <OutputBlock T={T}>{'Authorized as ada@example.com\nActive organization: Acme'}</OutputBlock>
      <div style={{ height: '14px' }} />
      <CommandBlock T={T} title="Verify session" command="vextis auth whoami" />
    </>
  );
}

function ConceptPage({ T, id }) {
  const concept = CONCEPTS.find(([title]) => title.toLowerCase() === id.replace('-', ' ')) ?? CONCEPTS[0];
  return (
    <>
      <PageTitle T={T} label="core concept" title={concept[0]}>
        {concept[1]}
      </PageTitle>
      <div className="card-grid">
        {CONCEPTS.map(([title, body]) => (
          <div key={title} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '6px', padding: '16px' }}>
            <h2 style={{ fontFamily: FONTS.display, fontSize: '15px', color: T.textPrimary, marginBottom: '7px' }}>{title}</h2>
            <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, lineHeight: 1.6 }}>{body}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function PullPage({ T }) {
  return (
    <>
      <PageTitle T={T} label="cli" title="Pull config">
        Print resolved config as dotenv output. Useful for scripts and debugging.
      </PageTitle>
      <CommandBlock T={T} command="vextis config pull --app api --env development" />
      <div style={{ height: '14px' }} />
      <OutputBlock T={T}>DATABASE_URL=postgres://localhost:5432/app</OutputBlock>
      <div style={{ height: '14px' }} />
      <Callout T={T} type="warning">Do not redirect production config into a committed .env file.</Callout>
    </>
  );
}

function RunPage({ T }) {
  return (
    <>
      <PageTitle T={T} label="cli" title="Run with env">
        Start a child process with resolved config injected as environment variables.
      </PageTitle>
      <CommandBlock T={T} command="vextis run --app api --env development -- npm run dev" />
      <div style={{ height: '14px' }} />
      <OutputBlock T={T}>{'Loaded config for api / development\nStarting npm run dev'}</OutputBlock>
    </>
  );
}

function CicdPage({ T }) {
  const yaml = [
    'name: deploy',
    '',
    'on:',
    '  push:',
    '    branches: [main]',
    '',
    'jobs:',
    '  deploy:',
    '    runs-on: ubuntu-latest',
    '    env:',
    '      VEXTIS_TOKEN: ${{ secrets.VEXTIS_TOKEN }}',
    '    steps:',
    '      - uses: actions/checkout@v4',
    `      - run: ${INSTALL_COMMAND}`,
    '      - run: vextis run --app api --env production -- npm run build',
  ].join('\n');

  return (
    <>
      <PageTitle T={T} label="deploy" title="CI/CD">
        Store an organization access key in your CI provider as VEXTIS_TOKEN, then run build or deploy commands through the CLI.
      </PageTitle>
      <CommandBlock T={T} title="GitHub Actions" command={yaml} />
      <div style={{ height: '14px' }} />
      <Callout T={T}>Use organization access keys for CI/CD. Do not use personal tokens in production automation.</Callout>
    </>
  );
}

function SecurityPage({ T }) {
  return (
    <>
      <PageTitle T={T} label="security" title="Security model">
        vextis treats all parameter values as sensitive.
      </PageTitle>
      <div className="card-grid">
        <Card T={T} title="Encrypted at rest" body="Values are encrypted before storage and decrypted only after auth checks." />
        <Card T={T} title="Scoped access" body="Tokens can be limited by app, environment, and permission scope." />
        <Card T={T} title="Audit trail" body="Reads, writes, reveals, and token activity are recorded." />
        <Card T={T} title="Blank means inherit" body="Empty values unset local config instead of shadowing parent config." />
      </div>
    </>
  );
}

function TokensPage({ T }) {
  return (
    <>
      <PageTitle T={T} label="security" title="Access tokens">
        Use personal tokens for developer automation and organization access keys for CI/CD.
      </PageTitle>
      <Callout T={T} type="warning">Tokens are shown once. Store automation tokens in your CI provider secret store immediately.</Callout>
      <div style={{ height: '16px' }} />
      <SmallHeading T={T}>Common scopes</SmallHeading>
      <Table T={T} rows={TOKEN_SCOPES} firstColumnWidth="170px" />
    </>
  );
}

function AuditPage({ T }) {
  return (
    <>
      <PageTitle T={T} label="security" title="Audit logs">
        Audit logs help you answer who touched config, which token was used, and when a sensitive action happened.
      </PageTitle>
      <Table T={T} rows={[
        ['config.read', 'A token or user fetched resolved config.'],
        ['parameter.write', 'A value was changed for an environment.'],
        ['access_key.create', 'A personal or organization token was created.'],
        ['access_key.revoke', 'A token was revoked.'],
      ]} firstColumnWidth="170px" />
    </>
  );
}

function InheritancePage({ T }) {
  return (
    <>
      <PageTitle T={T} label="core concept" title="Inheritance">
        The most specific set value wins. If a local value is unset, vextis falls back to parent config.
      </PageTitle>
      <Table T={T} rows={[
        ['base', 'DATABASE_URL = postgres://shared'],
        ['api/development', 'DATABASE_URL = unset'],
        ['api/production', 'DATABASE_URL = postgres://prod'],
        ['resolved development', 'postgres://shared'],
        ['resolved production', 'postgres://prod'],
      ]} firstColumnWidth="180px" />
    </>
  );
}

function CliReferencePage({ T }) {
  return (
    <>
      <PageTitle T={T} label="reference" title="CLI reference">
        The current command surface.
      </PageTitle>
      <Table T={T} rows={CLI_COMMANDS.map(([cmd, body]) => [`vextis ${cmd}`, body])} firstColumnWidth="280px" />
    </>
  );
}

function ComingSoonPage({ T, page }) {
  return (
    <>
      <PageTitle T={T} label={page.group} title={page.title}>
        {page.description}
      </PageTitle>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '6px', padding: '18px' }}>
        <Badge T={T} variant="default">soon</Badge>
        <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, lineHeight: 1.65, marginTop: '12px' }}>
          This page is not published yet. Use the CLI and dashboard flows documented in the quickstart for now.
        </p>
      </div>
    </>
  );
}

function TroubleshootingPage({ T }) {
  return (
    <>
      <PageTitle T={T} label="reference" title="Troubleshooting">
        Common setup, token, and permission issues.
      </PageTitle>
      <div style={{ display: 'grid', gap: '8px' }}>
        {TROUBLESHOOTING.map(([title, body]) => (
          <details key={title} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '6px', padding: '12px 14px' }}>
            <summary style={{ cursor: 'pointer', fontFamily: FONTS.display, fontSize: '14px', color: T.textPrimary, fontWeight: 600 }}>
              {title}
            </summary>
            <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, lineHeight: 1.6, marginTop: '9px' }}>{body}</p>
          </details>
        ))}
      </div>
    </>
  );
}

function Table({ T, rows, firstColumnWidth = '190px' }) {
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: '6px', overflow: 'hidden' }}>
      {rows.map(([left, right], index) => (
        <div key={`${left}-${index}`} className="docs-table-row" style={{
          display: 'grid',
          gridTemplateColumns: `${firstColumnWidth} minmax(0, 1fr)`,
          gap: '16px',
          padding: '12px 14px',
          background: T.surface,
          borderBottom: index === rows.length - 1 ? 'none' : `1px solid ${T.border}`,
        }}>
          <code style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.termGreen }}>{left}</code>
          <span style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, lineHeight: 1.55 }}>{right}</span>
        </div>
      ))}
    </div>
  );
}

function DocsContent({ T, activePageId, go }) {
  const page = ALL_PAGES.find(item => item.id === activePageId) ?? ALL_PAGES[0];

  if (page.id === 'overview') return <OverviewPage T={T} go={go} />;
  if (page.id === 'quickstart') return <QuickstartPage T={T} />;
  if (page.id === 'install-cli') return <InstallPage T={T} />;
  if (page.id === 'cli-login') return <LoginPage T={T} />;
  if (['apps', 'environments', 'parameters'].includes(page.id)) return <ConceptPage T={T} id={page.id} />;
  if (page.id === 'inheritance') return <InheritancePage T={T} />;
  if (page.id === 'config-pull') return <PullPage T={T} />;
  if (page.id === 'run-with-env') return <RunPage T={T} />;
  if (page.id === 'ci-cd') return <CicdPage T={T} />;
  if (page.id === 'security-model') return <SecurityPage T={T} />;
  if (page.id === 'access-tokens') return <TokensPage T={T} />;
  if (page.id === 'audit-logs') return <AuditPage T={T} />;
  if (page.id === 'cli-reference') return <CliReferencePage T={T} />;
  if (page.id === 'troubleshooting') return <TroubleshootingPage T={T} />;
  return <ComingSoonPage T={T} page={page} />;
}

export function DocsPage() {
  const { T } = useTheme();
  const [activePageId, setActivePageId] = useState(getInitialPageId);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (id) => {
    if (!ALL_PAGES.some(page => page.id === id)) return;
    window.history.pushState(null, '', `#${id}`);
    setActivePageId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const syncHash = () => {
      setActivePageId(getInitialPageId());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  useEffect(() => {
    const onKeyDown = event => {
      const target = event.target;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !typing) {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div style={{ background: T.bg, minHeight: '100vh', color: T.textPrimary }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: ${T.termGreenBg}; color: ${T.textPrimary}; }
        .docs-top-nav { position: sticky; top: 0; z-index: 100; height: 56px; }
        .docs-nav-inner { max-width: 1160px; margin: 0 auto; height: 56px; padding: 0 32px; display: flex; align-items: center; gap: 22px; }
        .docs-brand { display: flex; align-items: center; gap: 9px; min-width: 140px; }
        .docs-search-wrap { flex: 1; display: flex; justify-content: center; }
        .docs-top-links, .docs-actions { display: flex; align-items: center; gap: 6px; }
        .docs-top-links a { font-family: ${FONTS.mono}; font-size: 11px; color: ${T.textMuted}; text-decoration: none; padding: 6px 8px; }
        .docs-shell { max-width: 1160px; margin: 0 auto; padding: 38px 32px 88px; display: grid; grid-template-columns: 244px minmax(0, 720px); gap: 44px; align-items: start; }
        .docs-sidebar { position: sticky; top: 78px; align-self: start; padding-right: 20px; }
        .docs-page { min-width: 0; }
        .card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .doc-card { min-width: 0; }
        .doc-card:hover, .search-result:hover { border-color: ${T.borderHover} !important; background: ${T.overlay} !important; }
        .docs-sidebar-link:hover, .docs-top-links a:hover { color: ${T.textPrimary} !important; }
        .command-block { max-width: 100%; }
        .docs-mobile-layer, .docs-modal-layer { position: fixed; inset: 0; z-index: 220; }
        .docs-mobile-backdrop, .docs-modal-backdrop { position: absolute; inset: 0; border: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.58); }
        .docs-mobile-panel { position: relative; width: min(340px, 86vw); min-height: 100vh; overflow: auto; }
        .docs-mobile-panel .docs-sidebar { display: block; position: static; border-right: 0 !important; padding-right: 0; }
        .docs-search-dialog { position: relative; width: min(620px, calc(100vw - 32px)); margin: 86px auto 0; border-radius: 8px; overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,0.45); }
        summary::marker { color: ${T.termGreen}; }
        @media (max-width: 900px) {
          .docs-shell { grid-template-columns: 220px minmax(0, 1fr); gap: 28px; }
          .docs-actions, .docs-top-links { display: none; }
          .docs-search-button { min-width: 220px !important; }
        }
        @media (max-width: 760px) {
          .docs-nav-inner { padding: 0 18px; gap: 12px; }
          .docs-brand { min-width: auto; }
          .docs-brand span:last-child { display: none; }
          .docs-search-wrap { justify-content: stretch; }
          .docs-search-button { min-width: 0 !important; width: 100%; }
          .docs-search-button span:last-child { display: none; }
          .docs-menu-button { display: inline-flex !important; }
          .docs-shell { display: block; padding: 26px 18px 70px; }
          .docs-shell > .docs-sidebar { display: none; }
          .card-grid { grid-template-columns: 1fr; }
          .step-row, .docs-table-row { grid-template-columns: 1fr !important; }
          h1 { font-size: 32px !important; }
          pre { max-width: 100%; overflow-x: auto; }
        }
      `}</style>

      <TopNav T={T} onSearchOpen={() => setSearchOpen(true)} onMenuOpen={() => setMobileOpen(true)} />
      <SearchDialog T={T} open={searchOpen} onClose={() => setSearchOpen(false)} onSelect={go} />
      <MobileMenu T={T} open={mobileOpen} activePageId={activePageId} onClose={() => setMobileOpen(false)} onSelect={go} />

      <div className="docs-shell">
        <Sidebar T={T} activePageId={activePageId} onSelect={go} />
        <main className="docs-page">
          <DocsContent T={T} activePageId={activePageId} go={go} />
        </main>
      </div>
    </div>
  );
}
