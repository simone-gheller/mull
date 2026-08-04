import { useOutletContext } from 'react-router-dom';
import { ComingSoonPage } from '../components/content/ComingSoon.jsx';
import { findPageByPath } from '../content/navigation.js';

export default function SdksPage() {
  const { T } = useOutletContext();
  return <ComingSoonPage T={T} page={findPageByPath('/sdks')} />;
}
