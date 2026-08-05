import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme, FONTS } from '@vextis/ui';
import { TopNav } from '../components/layout/TopNav.jsx';
import { GlobalStyles } from '../components/layout/GlobalStyles.jsx';
import { MobileMenu } from '../components/layout/MobileMenu.jsx';
import { SearchDialog } from '../components/search/SearchDialog.jsx';
import { OperationList } from '../components/api/OperationList.jsx';
import { OperationDetail } from '../components/api/OperationDetail.jsx';
import { SchemaTable } from '../components/api/SchemaTable.jsx';
import { groupOperations, getOperation, operationKey } from '../lib/openapi.js';
import spec from '../content/openapi.json';

// A lightweight, hand-built OpenAPI viewer in @vextis/ui's own visual language, driven by the
// bundled spec (src/content/openapi.json) — no third-party reference-UI dependency. Sits outside
// DocsLayout's sidebar (Scalar/Doppler-style split from the guide pages) but reuses the same
// TopNav/GlobalStyles/search so navigation stays consistent across the whole site.
export default function ApiReferencePage() {
  const { T } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const groups = groupOperations(spec);
  const serverUrl = spec.servers?.[0]?.url ?? '';

  useEffect(() => {
    const onKeyDown = event => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName) || event.target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !typing) {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const opParam = searchParams.get('op'); // "METHOD /path"
  const [method, path] = opParam ? [opParam.slice(0, opParam.indexOf(' ')), opParam.slice(opParam.indexOf(' ') + 1)] : [null, null];
  const operation = method && path ? getOperation(spec, method, path) : null;
  const selectedKey = method && path ? operationKey(method, path) : null;

  const selectOperation = (m, p) => setSearchParams({ op: operationKey(m, p) });
  const selectOperationMobile = (m, p) => { selectOperation(m, p); setMobileOpen(false); };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column' }}>
      <GlobalStyles T={T} />
      <TopNav T={T} onSearchOpen={() => setSearchOpen(true)} onMenuOpen={() => setMobileOpen(true)} />
      <SearchDialog T={T} open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileMenu T={T} open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <OperationList T={T} groups={groups} selectedKey={selectedKey} onSelect={selectOperationMobile} />
      </MobileMenu>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <aside className="api-sidebar" style={{
          width: '280px',
          flexShrink: 0,
          borderRight: `1px solid ${T.border}`,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 56px)',
          position: 'sticky',
          top: '56px',
        }}>
          <OperationList T={T} groups={groups} selectedKey={selectedKey} onSelect={selectOperation} />
        </aside>

        <main style={{ flex: 1, minWidth: 0, padding: '36px 40px' }}>
          {operation ? (
            <OperationDetail T={T} method={method} path={path} operation={operation} serverUrl={serverUrl} />
          ) : (
            <Introduction T={T} serverUrl={serverUrl} groups={groups} />
          )}
        </main>
      </div>
    </div>
  );
}

function Introduction({ T, serverUrl, groups }) {
  const operationCount = groups.reduce((sum, g) => sum + g.operations.length, 0);

  return (
    <div style={{ maxWidth: '660px' }}>
      <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
        {spec.info?.version ? `v${spec.info.version}` : ''} · OpenAPI 3
      </div>
      <h1 style={{ fontFamily: FONTS.display, fontSize: '34px', letterSpacing: '-0.03em', color: T.textPrimary, marginBottom: '14px' }}>
        {spec.info?.title ?? 'API reference'}
      </h1>
      <p style={{ fontFamily: FONTS.display, fontSize: '14px', color: T.textSecondary, lineHeight: 1.75, marginBottom: '24px' }}>
        {spec.info?.description}
      </p>

      <h2 style={{ fontFamily: FONTS.display, fontSize: '15px', fontWeight: 600, color: T.textPrimary, marginBottom: '10px' }}>Server</h2>
      <SchemaTable T={T} rows={(spec.servers ?? []).map(s => ({
        name: s.url,
        type: '',
        required: false,
        description: s.url === serverUrl ? `${s.description ?? ''} (used in examples)` : (s.description ?? ''),
      }))} />

      <h2 style={{ fontFamily: FONTS.display, fontSize: '15px', fontWeight: 600, color: T.textPrimary, margin: '24px 0 10px' }}>Authentication</h2>
      <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, lineHeight: 1.7 }}>
        {spec.components?.securitySchemes?.bearerAuth?.description ?? 'Every request carries an Authorization: Bearer <token> header.'}
      </p>

      <h2 style={{ fontFamily: FONTS.display, fontSize: '15px', fontWeight: 600, color: T.textPrimary, margin: '24px 0 4px' }}>
        {operationCount} endpoints across {groups.length} resources
      </h2>
      <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textMuted, lineHeight: 1.7 }}>
        Pick one from the sidebar to see its parameters, request body, and response shape.
      </p>
    </div>
  );
}
