import { useOutletContext } from 'react-router-dom';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { Table } from '../components/content/Table.jsx';

export default function InheritancePage() {
  const { T } = useOutletContext();

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
