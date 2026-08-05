import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DocsLayout } from './components/layout/DocsLayout.jsx';
import { LEGACY_HASH_REDIRECTS, PATH_REDIRECTS } from './content/navigation.js';

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
import AuthenticationPage from './pages/AuthenticationPage.jsx';
import SecretsVisibilityPage from './pages/SecretsVisibilityPage.jsx';
import AboutVextisPage from './pages/AboutVextisPage.jsx';
import ChangelogPage from './pages/ChangelogPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// Keeps the API reference's own dependencies out of every /docs/* page's bundle — only visitors
// who actually open /api pay for it.
const ApiReferencePage = lazy(() => import('./pages/ApiReferencePage.jsx'));

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
        {/* Old flat paths (pre /docs + /api restructure) — one redirect per PATH_REDIRECTS entry. */}
        {Object.entries(PATH_REDIRECTS).map(([oldPath, newPath]) => (
          <Route key={oldPath} path={oldPath} element={<Navigate to={newPath} replace />} />
        ))}

        <Route element={<DocsLayout />}>
          <Route path="/docs" element={<OverviewPage />} />
          <Route path="/docs/quickstart" element={<QuickstartPage />} />
          <Route path="/docs/about" element={<AboutVextisPage />} />

          <Route path="/docs/organizations" element={<OrganizationsPage />} />
          <Route path="/docs/apps" element={<ConceptPage title="Apps" screenshot={{
            src: '/screenshots/dashboard-apps.png',
            alt: 'The Apps page in the vextis dashboard, showing the app tree and hierarchy detail panel.',
            caption: 'Apps in the dashboard — own, inherited, and override counts per app.',
          }} />} />
          <Route path="/docs/environments" element={<ConceptPage title="Environments" screenshot={{
            src: '/screenshots/dashboard-environments.png',
            alt: 'The Environments page in the vextis dashboard.',
            caption: 'Environments in the dashboard.',
          }} />} />
          <Route path="/docs/parameters" element={<ConceptPage title="Parameters" screenshot={{
            src: '/screenshots/dashboard-parameters.png',
            alt: 'The Parameters page in the vextis dashboard.',
            caption: 'Parameters in the dashboard, scoped to the selected app.',
          }} />} />
          <Route path="/docs/inheritance" element={<InheritancePage />} />
          <Route path="/docs/authentication" element={<AuthenticationPage />} />
          <Route path="/docs/access-tokens" element={<TokensPage />} />
          <Route path="/docs/secrets-visibility" element={<SecretsVisibilityPage />} />
          <Route path="/docs/roles-permissions" element={<RolesPage />} />

          <Route path="/docs/install-cli" element={<InstallPage />} />
          <Route path="/docs/cli-login" element={<LoginPage />} />
          <Route path="/docs/cli-reference" element={<CliReferencePage />} />
          <Route path="/docs/config-commands" element={<ConfigCommandsPage />} />
          <Route path="/docs/linking-a-project" element={<LinkingProjectPage />} />
          <Route path="/docs/troubleshooting" element={<TroubleshootingPage />} />

          <Route path="/docs/run-with-env" element={<RunPage />} />
          <Route path="/docs/ci-cd" element={<CicdPage />} />

          <Route path="/docs/security-model" element={<SecurityPage />} />
          <Route path="/docs/audit-logs" element={<AuditPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* API reference and changelog both own their own full-width layout — no DocsLayout
            sidebar, since neither has anything to navigate between within the page itself. Both
            reuse TopNav/GlobalStyles directly for consistent nav chrome. */}
        <Route path="/api/*" element={
          <Suspense fallback={null}>
            <ApiReferencePage />
          </Suspense>
        } />
        <Route path="/changelog" element={<ChangelogPage />} />
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
