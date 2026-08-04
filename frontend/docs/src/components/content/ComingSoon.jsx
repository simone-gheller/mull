import { Badge, FONTS } from '@vextis/ui';
import { PageTitle } from './PageTitle.jsx';

export function ComingSoonBadge({ T }) {
  return <Badge T={T} variant="default">soon</Badge>;
}

export function ComingSoonPage({ T, page }) {
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
