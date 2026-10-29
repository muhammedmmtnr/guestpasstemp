import { lazy, Suspense } from 'react';
import PublicApp from './App';

const AdminEntry = lazy(() => import('./admin-panel/Entry'));

function RootApp() {
  const isAdminPath = window.location.pathname === '/admin'
    || window.location.pathname.startsWith('/admin/');
  const returnPath = new URLSearchParams(window.location.search).get('from') || ''
  const isAdminLogin = window.location.pathname === '/login' && returnPath.startsWith('/admin')

  if (!isAdminPath && !isAdminLogin) return <PublicApp />;

  return (
    <Suspense fallback={<main className="user-details-page"><p role="status">Loading admin panel…</p></main>}>
      <AdminEntry />
    </Suspense>
  );
}

export default RootApp;
