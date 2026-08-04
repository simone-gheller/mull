import { Link, useOutletContext } from 'react-router-dom';
import { FONTS, Btn } from '@vextis/ui';
import { PageTitle } from '../components/content/PageTitle.jsx';

export default function NotFoundPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="404" title="Page not found">
        There's no docs page at this address.
      </PageTitle>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <Btn T={T} variant="secondary" size="sm">Back to overview</Btn>
      </Link>
    </>
  );
}
