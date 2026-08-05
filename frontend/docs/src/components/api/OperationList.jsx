import { FONTS, useScrollActiveIntoView } from '@vextis/ui';
import { MethodBadge } from './MethodBadge.jsx';
import { operationKey, operationLabel } from '../../lib/openapi.js';

// Left-hand nav for the API reference — grouped by tag, same auto-hide scrollbar + scroll-active-
// into-view behavior as the docs sidebar (Sidebar.jsx), reused here via the same shared hook.
export function OperationList({ T, groups, selectedKey, onSelect }) {
  const scrollRef = useScrollActiveIntoView(selectedKey);

  return (
    <div ref={scrollRef} className="ui-scroll-fade" style={{ flex: 1, overflowY: 'auto', padding: '18px 12px' }}>
      {groups.map(group => (
        <div key={group.tag} style={{ marginBottom: '18px' }}>
          <div style={{
            fontFamily: FONTS.mono,
            fontSize: '10px',
            color: T.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            padding: '0 8px 8px',
          }}>
            {group.tag}
          </div>
          <div style={{ display: 'grid', gap: '1px' }}>
            {group.operations.map(op => {
              const key = operationKey(op.method, op.path);
              const active = key === selectedKey;
              return (
                <button
                  key={key}
                  type="button"
                  data-nav-active={active}
                  onClick={() => onSelect(op.method, op.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    background: active ? T.elevated : 'transparent',
                    border: 'none',
                    borderLeft: `2px solid ${active ? T.termGreen : 'transparent'}`,
                    borderRadius: '0 6px 6px 0',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <MethodBadge T={T} method={op.method} />
                  <span style={{
                    fontFamily: FONTS.display,
                    fontSize: '13px',
                    color: active ? T.textPrimary : T.textSecondary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {operationLabel(op.method, op.path)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
