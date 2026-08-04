import { useOutletContext } from 'react-router-dom';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { Table } from '../components/content/Table.jsx';
import { AUDIT_EVENTS } from '../content/auditEvents.js';

export default function AuditPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="security" title="Audit logs">
        Audit logs help you answer who touched config, which token was used, and when a sensitive action happened.
      </PageTitle>
      <Table T={T} rows={AUDIT_EVENTS} firstColumnWidth="240px" />
    </>
  );
}
