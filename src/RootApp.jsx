import { lazy, Suspense } from 'react';
import PublicApp from './App';

const AdminEntry = lazy(() => import('./admin-panel/Entry'));
const PartnerApp = lazy(() => import('./PartnerApp'));

function RootApp() {
  const isPartnerPath = window.location.pathname === '/partner'
    || window.location.pathname.startsWith('/partner/');
  const isAdminPath = window.location.pathname === '/admin'
    || window.location.pathname.startsWith('/admin/');
  const returnPath = new URLSearchParams(window.location.search).get('from') || ''
  const isAdminLogin = window.location.pathname === '/login' && returnPath.startsWith('/admin')

  if (isPartnerPath) {
    return (
      <Suspense fallback={<main className="gp-loading">Opening your workspace…</main>}>
        <PartnerApp />
      </Suspense>
    );
  }

  if (!isAdminPath && !isAdminLogin) return <PublicApp />;

  return (
    <Suspense fallback={<main className="user-details-page"><p role="status">Loading admin panel…</p></main>}>
      <AdminEntry />
    </Suspense>
  );
}

export default RootApp;
