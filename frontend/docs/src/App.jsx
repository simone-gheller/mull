import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DocsLayout } from './components/layout/DocsLayout.jsx';
import { LEGACY_HASH_REDIRECTS } from './content/navigation.js';

import OverviewPage from './pages/OverviewPage.jsx';
import QuickstartPage from './pages/QuickstartPage.jsx';
import InstallPage from './pages/InstallPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import OrganizationsPage from './pages/OrganizationsPage.jsx';
import ConceptPage from './pages/ConceptPage.jsx';
import InheritancePage from './pages/InheritancePage.jsx';
import CliReferencePage from './pages/CliReferencePage.jsx';
import ConfigCommandsPage from './pages/ConfigCommandsPage.jsx';
import LinkingProjectPage from './pages/LinkingProjectPage.jsx';
import TroubleshootingPage from './pages/TroubleshootingPage.jsx';
import RunPage from './pages/RunPage.jsx';
import CicdPage from './pages/CicdPage.jsx';
import TokensPage from './pages/TokensPage.jsx';
import SecurityPage from './pages/SecurityPage.jsx';
import RolesPage from './pages/RolesPage.jsx';
import AuditPage from './pages/AuditPage.jsx';
import ApiBasicsPage from './pages/ApiBasicsPage.jsx';
import SdksPage from './pages/SdksPage.jsx';
import ChangelogPage from './pages/ChangelogPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// The pre-router site used #hash ids (e.g. #security-model). Anything landing here with a
// matching hash — a bookmark, an external link that hasn't been updated yet — gets sent to
// its real path instead of silently rendering the overview.
function HashRedirect() {
  const location = useLocation();
  const hashId = location.hash.replace('#', '');
  const target = LEGACY_HASH_REDIRECTS[hashId];
  if (target) return <Navigate to={target} replace />;
  return null;
}

function AppRoutes() {
  return (
    <>
      <HashRedirect />
      <Routes>
        <Route element={<DocsLayout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/quickstart" element={<QuickstartPage />} />
          <Route path="/install-cli" element={<InstallPage />} />
          <Route path="/cli-login" element={<LoginPage />} />

          <Route path="/organizations" element={<OrganizationsPage />} />
          <Route path="/apps" element={<ConceptPage title="Apps" />} />
          <Route path="/environments" element={<ConceptPage title="Environments" />} />
          <Route path="/parameters" element={<ConceptPage title="Parameters" />} />
          <Route path="/inheritance" element={<InheritancePage />} />

          <Route path="/cli-reference" element={<CliReferencePage />} />
          <Route path="/config-commands" element={<ConfigCommandsPage />} />
          <Route path="/linking-a-project" element={<LinkingProjectPage />} />
          <Route path="/troubleshooting" element={<TroubleshootingPage />} />

          <Route path="/run-with-env" element={<RunPage />} />
          <Route path="/ci-cd" element={<CicdPage />} />
          <Route path="/access-tokens" element={<TokensPage />} />

          <Route path="/security-model" element={<SecurityPage />} />
          <Route path="/roles-permissions" element={<RolesPage />} />
          <Route path="/audit-logs" element={<AuditPage />} />

          <Route path="/api-basics" element={<ApiBasicsPage />} />
          <Route path="/sdks" element={<SdksPage />} />
          <Route path="/changelog" element={<ChangelogPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
