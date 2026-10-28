import { useCallback, useEffect, useRef, useState } from 'react';
import { createGuestCapabilityToken, validateGuestInput } from './domain';
import { getQueueErrorMessage } from './errors';
import {
  cancelGuestQueueEntry,
  getGuestQueueEntry,
  joinQueue,
  subscribeToGuestEntry,
} from './queue';
import { getRestaurantBySlug } from './restaurant';

const STATUS_COPY = {
  WAITING: { label: 'You’re in the queue', description: 'We’ll let you know when your table is ready.' },
  READY: { label: 'Your table is ready', description: 'Please head to the host stand.' },
  SEATED: { label: 'You’re seated', description: 'Enjoy your meal!' },
  CANCELLED: { label: 'Queue entry cancelled', description: 'You have left this restaurant’s queue.' },
  NO_SHOW: { label: 'Marked as no-show', description: 'Please speak with the restaurant team if you still need help.' },
};

function PageFrame({ children, className = '' }) {
  return (
    <main className={`queue-page ${className}`}>
      <a className="queue-brand" href="/" aria-label="GuestPass home">
        <span className="queue-brand-mark">G</span>
        <span>GuestPass</span>
      </a>
      {children}
    </main>
  );
}

function QueueState({ title, children, action }) {
  return (
    <section className="queue-state-card">
      <div className="queue-state-icon" aria-hidden="true">⌁</div>
      <h1>{title}</h1>
      {children ? <p>{children}</p> : null}
      {action}
    </section>
  );
}

export function QueueJoinPage({ slug }) {
  const tableLabel = new URLSearchParams(window.location.search).get('table')?.trim() || '';
  const [restaurant, setRestaurant] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [form, setForm] = useState({ name: '', partySize: '2', phone: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tokenRef = useRef('');

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError('');

    getRestaurantBySlug(slug)
      .then((record) => {
        if (active) setRestaurant(record);
      })
      .catch((loadFailure) => {
        if (active) setLoadError(loadFailure.message || 'Could not load this restaurant.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug, retry]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
    setError('');
  }

  async function handleJoin(event) {
    event.preventDefault();
    if (isSubmitting || !restaurant) return;

    const validated = validateGuestInput(form, restaurant.max_party_size);
    setFieldErrors(validated.errors);
    setError('');
    if (Object.keys(validated.errors).length > 0) return;

    setIsSubmitting(true);
    try {
      tokenRef.current ||= createGuestCapabilityToken();
      await joinQueue({
        slug: restaurant.slug,
        name: validated.value.name,
        partySize: validated.value.partySize,
        phone: validated.value.phone,
        tableLabel,
        guestToken: tokenRef.current,
      });
      window.location.assign(`/r/${encodeURIComponent(restaurant.slug)}/status#token=${tokenRef.current}`);
    } catch (joinError) {
      setError(joinError.message || getQueueErrorMessage(joinError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <PageFrame>
        <section className="queue-card queue-loading" role="status" aria-live="polite">
          <div className="queue-skeleton queue-skeleton-title" />
          <div className="queue-skeleton" />
          <div className="queue-skeleton" />
        </section>
      </PageFrame>
    );
  }

  if (loadError || !restaurant) {
    return (
      <PageFrame>
        <QueueState
          title="QR code unavailable"
          action={<button className="queue-button secondary" onClick={() => setRetry((count) => count + 1)}>Try again</button>}
        >
          {loadError || 'This restaurant could not be found. Check the QR code and try again.'}
        </QueueState>
      </PageFrame>
    );
  }

  if (!restaurant.is_open) {
    return (
      <PageFrame>
        <QueueState title={`${restaurant.name} is closed`}>
          This restaurant is not accepting queue entries right now. Please check back during opening hours.
        </QueueState>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <section className="queue-card" aria-labelledby="join-queue-title">
        <p className="queue-eyebrow">Skip the line, not the experience</p>
        <h1 id="join-queue-title">Join {restaurant.name}</h1>
        <p className="queue-intro">
          Add your party to the live waitlist and follow your place in line from your phone.
        </p>
        {tableLabel && <p className="queue-table-note">QR code for {tableLabel}</p>}
        <form className="queue-form" onSubmit={handleJoin} noValidate>
          <label>
            <span>Your name</span>
            <input
              name="name"
              autoComplete="name"
              maxLength={120}
              value={form.name}
              onChange={updateField}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'guest-name-error' : undefined}
              required
            />
            {fieldErrors.name && <span className="queue-field-error" id="guest-name-error">{fieldErrors.name}</span>}
          </label>
          <label>
            <span>Party size</span>
            <select name="partySize" value={form.partySize} onChange={updateField}>
              {Array.from({ length: restaurant.max_party_size }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>{count} {count === 1 ? 'guest' : 'guests'}</option>
              ))}
            </select>
            {fieldErrors.partySize && <span className="queue-field-error">{fieldErrors.partySize}</span>}
          </label>
          <label>
            <span>Phone number <small>Optional</small></span>
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={40}
              value={form.phone}
              onChange={updateField}
              aria-invalid={Boolean(fieldErrors.phone)}
            />
            {fieldErrors.phone && <span className="queue-field-error">{fieldErrors.phone}</span>}
          </label>
          {error && <p className="queue-alert" role="alert">{error}</p>}
          <button className="queue-button primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Joining…' : 'Join the queue'}
          </button>
        </form>
        <p className="queue-privacy-note">No account needed. Your live status is available with a private link.</p>
      </section>
    </PageFrame>
  );
}

export function GuestStatusPage({ slug }) {
  const guestToken = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
  const [entry, setEntry] = useState(null);
  const [error, setError] = useState('');
  const [liveError, setLiveError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const refresh = useCallback(async () => {
    if (!guestToken) {
      setError('This private status link is incomplete. Scan the restaurant QR code again to join.');
      setIsLoading(false);
      return;
    }

    try {
      const currentEntry = await getGuestQueueEntry(guestToken);
      if (!currentEntry || currentEntry.restaurant_slug !== slug) {
        throw new Error('This private status link is invalid or no longer available.');
      }
      setEntry(currentEntry);
      setError('');
    } catch (refreshError) {
      setError(refreshError.message || 'Could not load your queue status.');
    } finally {
      setIsLoading(false);
    }
  }, [guestToken, slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!entry?.id || !guestToken) return undefined;
    const unsubscribe = subscribeToGuestEntry(entry.id, refresh, (subscriptionError) => {
      setLiveError(subscriptionError.message);
    });
    const timer = window.setInterval(refresh, 20000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [entry?.id, guestToken, refresh]);

  async function handleCancel() {
    if (!window.confirm('Leave this queue? Your place will be cancelled.')) return;
    setIsCancelling(true);
    try {
      await cancelGuestQueueEntry(guestToken);
      await refresh();
    } catch (cancelError) {
      setError(cancelError.message || 'Could not cancel your queue entry.');
    } finally {
      setIsCancelling(false);
    }
  }

  if (isLoading) {
    return (
      <PageFrame>
        <section className="queue-card queue-loading" role="status" aria-live="polite">
          <div className="queue-skeleton queue-skeleton-title" />
          <div className="queue-skeleton" />
        </section>
      </PageFrame>
    );
  }

  if (error || !entry) {
    return (
      <PageFrame>
        <QueueState
          title="Status unavailable"
          action={<a className="queue-button secondary" href={`/r/${encodeURIComponent(slug)}`}>Return to restaurant</a>}
        >
          {error || 'We could not load your queue status.'}
        </QueueState>
      </PageFrame>
    );
  }

  const status = STATUS_COPY[entry.status] || { label: 'Status updated', description: '' };
  const isActive = entry.status === 'WAITING' || entry.status === 'READY';

  return (
    <PageFrame>
      <section className="queue-card guest-status-card" aria-labelledby="guest-status-title">
        <div className={`queue-status-mark status-${entry.status.toLowerCase()}`} aria-hidden="true">
          {entry.status === 'READY' ? '✓' : entry.status === 'SEATED' ? '♥' : '•'}
        </div>
        <p className="queue-eyebrow">{entry.restaurant_name}</p>
        <h1 id="guest-status-title">{status.label}</h1>
        <p className="queue-intro">{status.description}</p>
        {entry.status === 'WAITING' && (
          <div className="queue-position-grid">
            <div>
              <span className="queue-metric-value">{entry.position}</span>
              <span className="queue-metric-label">Your place</span>
            </div>
            <div>
              <span className="queue-metric-value">
                {entry.estimated_wait_minutes > 0 ? `~${entry.estimated_wait_minutes}` : 'Next'}
              </span>
              <span className="queue-metric-label">Minutes estimated</span>
            </div>
          </div>
        )}
        <div className="queue-ticket">
          <span>{entry.guest_name} · {entry.party_size} {entry.party_size === 1 ? 'guest' : 'guests'}</span>
          {entry.table_label && <span>{entry.table_label}</span>}
        </div>
        {liveError && <p className="queue-live-note" role="status">{liveError}</p>}
        {error && <p className="queue-alert" role="alert">{error}</p>}
        {isActive && (
          <button className="queue-button secondary" type="button" onClick={handleCancel} disabled={isCancelling}>
            {isCancelling ? 'Leaving…' : 'Leave the queue'}
          </button>
        )}
        <button className="queue-text-button" type="button" onClick={refresh}>Refresh status</button>
      </section>
    </PageFrame>
  );
}
