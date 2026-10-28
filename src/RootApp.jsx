import { lazy, Suspense } from 'react';
import PublicApp from './App';

const AdminEntry = lazy(() => import('./admin-panel/Entry'));

function RootApp() {
  const isAdminPath = window.location.pathname === '/admin'
    || window.location.pathname.startsWith('/admin/');

  if (!isAdminPath) return <PublicApp />;

  return (
    <Suspense fallback={<main className="user-details-page"><p role="status">Loading admin panel…</p></main>}>
      <AdminEntry />
    </Suspense>
  );
}

export default RootApp;
