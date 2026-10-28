import { lazy, Suspense } from 'react';
import './queue.css';

const QueueJoinPage = lazy(() => import('./GuestPages').then((module) => ({ default: module.QueueJoinPage })));
const GuestStatusPage = lazy(() => import('./GuestPages').then((module) => ({ default: module.GuestStatusPage })));
const StaffLoginPage = lazy(() => import('./StaffPages').then((module) => ({ default: module.StaffLoginPage })));
const StaffPortal = lazy(() => import('./StaffPages').then((module) => ({ default: module.StaffPortal })));

function decodeSlug(encodedSlug) {
  try {
    return decodeURIComponent(encodedSlug);
  } catch {
    return '';
  }
}

function InvalidQueueLink() {
  return (
    <main className="queue-page">
      <a className="queue-brand" href="/"><span className="queue-brand-mark">G</span><span>GuestPass</span></a>
      <section className="queue-state-card">
        <div className="queue-state-icon" aria-hidden="true">⌁</div>
        <h1>QR code unavailable</h1>
        <p>This restaurant link is incomplete or invalid. Scan the restaurant’s QR code again.</p>
        <a className="queue-button secondary" href="/">Go to GuestPass</a>
      </section>
    </main>
  );
}

function QueueLoading() {
  return (
    <main className="queue-page">
      <a className="queue-brand" href="/"><span className="queue-brand-mark">G</span><span>GuestPass</span></a>
      <section className="queue-card queue-loading" role="status" aria-live="polite">
        <div className="queue-skeleton queue-skeleton-title" />
        <div className="queue-skeleton" />
        <div className="queue-skeleton" />
      </section>
    </main>
  );
}

export default function QueueApp({ path }) {
  const statusMatch = path.match(/^\/r\/([^/]+)\/status\/?$/);
  if (statusMatch) {
    const slug = decodeSlug(statusMatch[1]);
    return slug ? (
      <Suspense fallback={<QueueLoading />}>
        <GuestStatusPage slug={slug} />
      </Suspense>
    ) : <InvalidQueueLink />;
  }

  const restaurantMatch = path.match(/^\/r\/([^/]+)\/?$/);
  if (restaurantMatch) {
    const slug = decodeSlug(restaurantMatch[1]);
    return slug ? (
      <Suspense fallback={<QueueLoading />}>
        <QueueJoinPage slug={slug} />
      </Suspense>
    ) : <InvalidQueueLink />;
  }

  if (path === '/staff/login' || path === '/staff/login/') {
    return <Suspense fallback={<QueueLoading />}><StaffLoginPage /></Suspense>;
  }

  if (path === '/staff' || path.startsWith('/staff/')) {
    return <Suspense fallback={<QueueLoading />}><StaffPortal path={path} /></Suspense>;
  }

  return <InvalidQueueLink />;
}
