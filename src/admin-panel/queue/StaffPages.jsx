import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../AuthProvider';
import {
  claimStaffInvitations,
  sendStaffInviteLink,
} from './auth';
import { getQueueErrorMessage } from './errors';
import { validateGuestInput } from './domain';
import {
  addWalkIn,
  getTodayQueueEntries,
  listQueueEntries,
  subscribeToRestaurantQueue,
  transitionQueueEntry,
} from './queue';
import {
  createRestaurant,
  inviteRestaurantStaff,
  listMyRestaurants,
  listRestaurantStaff,
  listStaffInvitations,
  removeRestaurantStaff,
  updateRestaurantSettings,
} from './restaurant';

const TABS = [
  { path: '/staff', label: 'Live queue' },
  { path: '/staff/settings', label: 'Queue settings' },
  { path: '/staff/qr', label: 'QR codes' },
  { path: '/staff/analytics', label: 'Analytics' },
  { path: '/staff/team', label: 'Staff' },
];

function PageStatus({ title, children, action }) {
  return (
    <section className="staff-state-card">
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </section>
  );
}

function RetryButton({ onClick }) {
  return <button className="staff-button secondary" type="button" onClick={onClick}>Retry</button>;
}

export function StaffLoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!auth.isConfigured) {
    return (
      <main className="staff-auth-page">
        <div className="staff-auth-card">
          <p className="staff-eyebrow">GuestPass staff</p>
          <h1>Staff sign in</h1>
          <div className="staff-error" role="alert">{auth.configurationError}</div>
        </div>
      </main>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await auth.signIn(email.trim(), password);
      setPassword('');
      window.location.replace('/staff');
    } catch (signInError) {
      setError(signInError.message || 'Sign in failed. Check your credentials and retry.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="staff-auth-page">
      <div className="staff-auth-card">
        <a className="queue-brand" href="/">
          <span className="queue-brand-mark">G</span>
          <span>GuestPass</span>
        </a>
        <p className="staff-eyebrow">Restaurant team</p>
        <h1>Staff sign in</h1>
        <p>Sign in with the email address invited by your restaurant owner.</p>
        {error && <div className="staff-error" role="alert">{error}</div>}
        <form className="staff-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </label>
          <button className="staff-button primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <a className="staff-back-link" href="/">Back to platform dashboard</a>
      </div>
    </main>
  );
}

export function StaffPortal({ path }) {
  const auth = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const loadAccess = useCallback(async () => {
    if (!auth.session?.user?.id) return;
    setIsLoading(true);
    setError('');
    try {
      await claimStaffInvitations();
      const currentMemberships = await listMyRestaurants(auth.session.user.id);
      setMemberships(currentMemberships);
    } catch (loadError) {
      setError(loadError.message || 'Could not load your restaurant access.');
    } finally {
      setIsLoading(false);
    }
  }, [auth.session?.user?.id]);

  useEffect(() => {
    if (!auth.isConfigured || auth.isLoading) return;
    if (!auth.session) {
      setIsLoading(false);
      return;
    }
    loadAccess();
  }, [auth.isConfigured, auth.isLoading, auth.session, loadAccess, retry]);

  if (!auth.isConfigured) return <StaffLoginPage />;
  if (auth.isLoading || isLoading) {
    return <main className="staff-auth-page"><p role="status">Checking your restaurant access…</p></main>;
  }
  if (!auth.session) {
    return <StaffLoginPage />;
  }
  if (error) {
    return (
      <main className="staff-auth-page">
        <PageStatus title="Could not load your access" action={<RetryButton onClick={() => setRetry((count) => count + 1)} />}>
          {error}
        </PageStatus>
      </main>
    );
  }
  const section = path === '/staff/setup'
    ? 'setup'
    : path.replace(/\/+$/, '') || '/staff';

  if (memberships.length === 0 && section === 'setup') {
    return (
      <RestaurantSetupPage
        memberships={memberships}
        onCreated={() => setRetry((count) => count + 1)}
        onSignOut={auth.signOut}
      />
    );
  }
  if (memberships.length === 0) {
    return (
      <main className="staff-auth-page">
        <PageStatus
          title="No restaurant access yet"
          action={(
            <div className="staff-empty-actions">
              <a className="staff-button primary" href="/staff/setup">Set up a restaurant</a>
              <button className="staff-button secondary" type="button" onClick={loadAccess}>Check invitations</button>
            </div>
          )}
        >
          This account is not linked to a restaurant. Ask an owner to invite this email address, or create your restaurant workspace.
        </PageStatus>
      </main>
    );
  }

  const requestedRestaurantId = new URLSearchParams(window.location.search).get('restaurant');
  const membership = memberships.find((row) => row.restaurant_id === requestedRestaurantId) || memberships[0];
  const restaurant = membership.restaurants;
  const isManager = membership.role === 'owner' || membership.role === 'manager';

  function selectRestaurant(event) {
    const url = new URL(window.location.href);
    url.searchParams.set('restaurant', event.target.value);
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
    setRetry((count) => count + 1);
  }

  if (section === 'setup') {
    return (
      <RestaurantSetupPage
        memberships={memberships}
        onCreated={() => setRetry((count) => count + 1)}
        onSignOut={auth.signOut}
      />
    );
  }

  if (!restaurant) {
    return (
      <main className="staff-auth-page">
        <PageStatus title="Restaurant details unavailable" action={<RetryButton onClick={() => setRetry((count) => count + 1)} />}>
          Your membership loaded, but the restaurant details were not returned. Confirm the migration is applied and RLS is configured.
        </PageStatus>
      </main>
    );
  }

  const selectedTab = section === '/staff' ? '/staff' : section;
  const managerOnly = ['/staff/team', '/staff/analytics', '/staff/settings', '/staff/qr'];
  if (managerOnly.includes(selectedTab) && !isManager) {
    return (
      <StaffLayout
        restaurant={restaurant}
        membership={membership}
        memberships={memberships}
        activePath="/staff"
        onSelectRestaurant={selectRestaurant}
        onSignOut={auth.signOut}
      >
        <PageStatus title="Owner or manager access required">
          You can manage the live queue, but only a restaurant owner or manager can view this section.
        </PageStatus>
      </StaffLayout>
    );
  }

  let content;
  switch (selectedTab) {
    case '/staff/settings':
      content = <QueueSettingsPage restaurant={restaurant} onSaved={() => setRetry((count) => count + 1)} />;
      break;
    case '/staff/qr':
      content = <QrCodesPage restaurant={restaurant} />;
      break;
    case '/staff/team':
      content = <StaffManagementPage restaurant={restaurant} currentUserId={auth.session.user.id} />;
      break;
    case '/staff/analytics':
      content = <AnalyticsPage restaurant={restaurant} />;
      break;
    default:
      content = <QueueDashboard restaurant={restaurant} />;
  }

  return (
    <StaffLayout
      restaurant={restaurant}
      membership={membership}
      memberships={memberships}
      activePath={selectedTab}
      onSelectRestaurant={selectRestaurant}
      onSignOut={auth.signOut}
    >
      {content}
    </StaffLayout>
  );
}

function StaffLayout({ restaurant, membership, memberships, activePath, onSelectRestaurant, onSignOut, children }) {
  return (
    <main className="staff-shell">
      <header className="staff-topbar">
        <a className="queue-brand" href="/staff">
          <span className="queue-brand-mark">G</span>
          <span>GuestPass</span>
        </a>
        <div className="staff-topbar-controls">
          {memberships.length > 1 && (
            <label className="staff-restaurant-select">
              <span className="visually-hidden">Restaurant</span>
              <select value={membership.restaurant_id} onChange={onSelectRestaurant}>
                {memberships.map((row) => (
                  <option value={row.restaurant_id} key={row.restaurant_id}>{row.restaurants?.name || 'Restaurant'}</option>
                ))}
              </select>
            </label>
          )}
          <span className="staff-role-pill">{membership.role}</span>
          <button
            type="button"
            className="staff-signout"
            onClick={() => onSignOut().catch(() => window.alert('Could not sign out. Please try again.'))}
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="staff-content-wrap">
        <div className="staff-heading-row">
          <div>
            <p className="staff-eyebrow">{restaurant.name}</p>
            <h1>{activePath === '/staff' ? 'Live queue' : TABS.find((tab) => tab.path === activePath)?.label || 'Restaurant setup'}</h1>
          </div>
          <span className={`staff-open-pill ${restaurant.is_open ? 'open' : 'closed'}`}>
            {restaurant.is_open ? 'Queue open' : 'Queue closed'}
          </span>
        </div>
        <nav className="staff-tabs" aria-label="Restaurant management">
          {TABS.map((tab) => (
            <a key={tab.path} href={`${tab.path}?restaurant=${restaurant.id}`} className={activePath === tab.path ? 'active' : ''}>
              {tab.label}
            </a>
          ))}
          {(membership.role === 'owner' || membership.role === 'manager') && (
            <a href={`/staff/setup?restaurant=${restaurant.id}`}>Restaurant</a>
          )}
        </nav>
        {children}
      </div>
    </main>
  );
}

function QueueDashboard({ restaurant }) {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveError, setLiveError] = useState('');
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState('ACTIVE');
  const [search, setSearch] = useState('');
  const [busyEntryId, setBusyEntryId] = useState('');
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkIn, setWalkIn] = useState({ name: '', partySize: '2', phone: '', tableLabel: '' });
  const [walkInError, setWalkInError] = useState('');
  const [isAddingWalkIn, setIsAddingWalkIn] = useState(false);

  const refresh = useCallback(async () => {
    setError('');
    try {
      setEntries(await listQueueEntries(restaurant.id));
    } catch (loadError) {
      setError(loadError.message || 'Could not load the queue.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurant.id]);

  useEffect(() => {
    setIsLoading(true);
    refresh();
    return subscribeToRestaurantQueue(restaurant.id, refresh, (subscriptionError) => {
      setLiveError(subscriptionError.message);
    });
  }, [restaurant.id, refresh, retry]);

  const visibleEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesStatus = filter === 'ALL'
        || (filter === 'ACTIVE' && ['WAITING', 'READY'].includes(entry.status))
        || entry.status === filter;
      const searchable = `${entry.guest_name} ${entry.phone || ''} ${entry.table_label || ''}`.toLowerCase();
      return matchesStatus && (!query || searchable.includes(query));
    });
  }, [entries, filter, search]);

  async function handleTransition(entry, nextStatus) {
    if (busyEntryId) return;
    if (['CANCELLED', 'NO_SHOW'].includes(nextStatus)
      && !window.confirm(`Change ${entry.guest_name} to ${nextStatus.replace('_', ' ').toLowerCase()}?`)) {
      return;
    }

    setBusyEntryId(entry.id);
    setError('');
    try {
      await transitionQueueEntry(entry.id, nextStatus);
      await refresh();
    } catch (actionError) {
      setError(actionError.message || 'Could not update this queue entry.');
    } finally {
      setBusyEntryId('');
    }
  }

  async function handleWalkIn(event) {
    event.preventDefault();
    if (isAddingWalkIn) return;
    const validation = validateGuestInput(walkIn, restaurant.max_party_size);
    if (walkIn.tableLabel.trim().length > 40) {
      validation.errors.tableLabel = 'Table label must be 40 characters or fewer.';
    }
    if (Object.keys(validation.errors).length) {
      setWalkInError(Object.values(validation.errors)[0]);
      return;
    }

    setWalkInError('');
    setIsAddingWalkIn(true);
    try {
      await addWalkIn({
        restaurantId: restaurant.id,
        name: validation.value.name,
        partySize: validation.value.partySize,
        phone: validation.value.phone,
        tableLabel: walkIn.tableLabel.trim() || null,
      });
      setWalkIn({ name: '', partySize: '2', phone: '', tableLabel: '' });
      setShowWalkIn(false);
      await refresh();
    } catch (addError) {
      setWalkInError(addError.message || 'Could not add this walk-in.');
    } finally {
      setIsAddingWalkIn(false);
    }
  }

  return (
    <section className="staff-panel" aria-labelledby="queue-list-title">
      <div className="staff-panel-toolbar">
        <div>
          <h2 id="queue-list-title">Today’s guests</h2>
          <p>Queue updates are live. Refresh if your connection drops.</p>
        </div>
        <div className="staff-toolbar-actions">
          <button className="staff-button secondary" type="button" onClick={() => setRetry((count) => count + 1)}>Refresh</button>
          <button className="staff-button primary" type="button" onClick={() => setShowWalkIn((shown) => !shown)}>
            {showWalkIn ? 'Close form' : 'Add walk-in'}
          </button>
        </div>
      </div>
      {liveError && <p className="staff-warning" role="status">{liveError}</p>}
      {error && <p className="staff-error" role="alert">{error}</p>}
      {showWalkIn && (
        <form className="staff-inline-form" onSubmit={handleWalkIn}>
          <h3>Add a walk-in guest</h3>
          <label><span>Name</span><input value={walkIn.name} maxLength={120} onChange={(event) => setWalkIn((current) => ({ ...current, name: event.target.value }))} required /></label>
          <label><span>Party size</span><input type="number" min="1" max={restaurant.max_party_size} value={walkIn.partySize} onChange={(event) => setWalkIn((current) => ({ ...current, partySize: event.target.value }))} required /></label>
          <label><span>Phone (optional)</span><input type="tel" maxLength={40} value={walkIn.phone} onChange={(event) => setWalkIn((current) => ({ ...current, phone: event.target.value }))} /></label>
          <label><span>Table (optional)</span><input maxLength={40} value={walkIn.tableLabel} onChange={(event) => setWalkIn((current) => ({ ...current, tableLabel: event.target.value }))} /></label>
          {walkInError && <p className="staff-error" role="alert">{walkInError}</p>}
          <button className="staff-button primary" type="submit" disabled={isAddingWalkIn}>{isAddingWalkIn ? 'Adding…' : 'Add to queue'}</button>
        </form>
      )}
      <div className="staff-queue-filters">
        <label>
          <span>Status</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="ACTIVE">Waiting and ready</option>
            <option value="ALL">All today</option>
            <option value="WAITING">Waiting</option>
            <option value="READY">Ready</option>
            <option value="SEATED">Seated</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No-show</option>
          </select>
        </label>
        <label className="staff-search">
          <span>Search guests</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, phone, table…" />
        </label>
      </div>
      {isLoading ? (
        <div className="staff-skeleton-list" role="status" aria-label="Loading queue">
          <div /><div /><div />
        </div>
      ) : error ? (
        <PageStatus title="Queue unavailable" action={<RetryButton onClick={() => setRetry((count) => count + 1)} />}>{error}</PageStatus>
      ) : visibleEntries.length === 0 ? (
        <PageStatus title={search ? 'No matching guests' : 'No queue entries today'}>
          {search ? 'Try another name, phone number, or table.' : 'New guest entries will appear here as soon as someone joins.'}
        </PageStatus>
      ) : (
        <div className="staff-queue-list">
          {visibleEntries.map((entry) => (
            <article className="staff-queue-row" key={entry.id}>
              <div className="staff-position">{entry.position}</div>
              <div className="staff-guest-copy">
                <strong>{entry.guest_name}</strong>
                <span>{entry.party_size} {entry.party_size === 1 ? 'guest' : 'guests'}{entry.table_label ? ` · ${entry.table_label}` : ''}</span>
                <span>{entry.phone || 'No phone provided'} · Joined {new Date(entry.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <span className={`staff-status-badge status-${entry.status.toLowerCase()}`}>{entry.status.replace('_', ' ')}</span>
              <div className="staff-entry-actions">
                {entry.status === 'WAITING' && <button type="button" onClick={() => handleTransition(entry, 'READY')} disabled={busyEntryId === entry.id}>Ready</button>}
                {entry.status === 'READY' && <button type="button" onClick={() => handleTransition(entry, 'SEATED')} disabled={busyEntryId === entry.id}>Seated</button>}
                {['WAITING', 'READY'].includes(entry.status) && (
                  <>
                    <button type="button" className="quiet" onClick={() => handleTransition(entry, 'CANCELLED')} disabled={busyEntryId === entry.id}>Cancel</button>
                    <button type="button" className="quiet" onClick={() => handleTransition(entry, 'NO_SHOW')} disabled={busyEntryId === entry.id}>No-show</button>
                  </>
                )}
                {['CANCELLED', 'NO_SHOW'].includes(entry.status) && (
                  <button type="button" onClick={() => handleTransition(entry, 'WAITING')} disabled={busyEntryId === entry.id}>Re-queue</button>
                )}
                {busyEntryId === entry.id && <span className="staff-busy-label">Saving…</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function RestaurantSetupPage({ memberships, onCreated, onSignOut }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [hoursText, setHoursText] = useState('{}');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [createdRestaurant, setCreatedRestaurant] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return;
    setError('');
    let hours;
    try {
      hours = JSON.parse(hoursText);
      if (!hours || typeof hours !== 'object' || Array.isArray(hours)) throw new Error();
    } catch {
      setError('Opening hours must be a valid JSON object.');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim().toLowerCase())) {
      setError('Use lowercase letters, numbers, and hyphens for the restaurant URL.');
      return;
    }

    setIsSaving(true);
    try {
      const restaurant = await createRestaurant({ name: name.trim(), slug: slug.trim().toLowerCase(), hours });
      setCreatedRestaurant(restaurant);
      onCreated();
    } catch (createError) {
      setError(createError.message || 'Could not create this restaurant. The URL may already be in use.');
    } finally {
      setIsSaving(false);
    }
  }

  if (createdRestaurant) {
    return (
      <main className="staff-auth-page">
        <PageStatus
          title="Restaurant created"
          action={<a className="staff-button primary" href={`/staff?restaurant=${createdRestaurant.id}`}>Open staff dashboard</a>}
        >
          {createdRestaurant.name} is ready. Owners can manage staff and settings from the dashboard.
        </PageStatus>
      </main>
    );
  }

  return (
    <main className="staff-auth-page">
      <section className="staff-auth-card staff-setup-card">
        <div className="staff-setup-actions">
          <a className="queue-brand" href="/staff"><span className="queue-brand-mark">G</span><span>GuestPass</span></a>
          {memberships.length > 0 && (
            <button
              type="button"
              className="staff-signout"
              onClick={() => onSignOut().catch(() => window.alert('Could not sign out. Please try again.'))}
            >
              Sign out
            </button>
          )}
        </div>
        <p className="staff-eyebrow">Restaurant workspace</p>
        <h1>{memberships.length ? 'Add a restaurant' : 'Set up your restaurant'}</h1>
        <p>Create a restaurant and become its first owner. Your account is managed by Supabase Auth.</p>
        <form className="staff-form" onSubmit={handleSubmit}>
          <label><span>Restaurant name</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required /></label>
          <label><span>Restaurant URL</span><div className="staff-slug-input"><span>/r/</span><input value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} maxLength={80} required /></div></label>
          <label>
            <span>Opening hours</span>
            <textarea value={hoursText} onChange={(event) => setHoursText(event.target.value)} rows={5} spellCheck="false" />
            <small>Enter a JSON object with your weekly schedule, for example {"{\"monday\":{\"open\":\"09:00\",\"close\":\"22:00\"}}"}.</small>
          </label>
          {error && <p className="staff-error" role="alert">{error}</p>}
          <button type="submit" className="staff-button primary" disabled={isSaving}>{isSaving ? 'Creating…' : 'Create restaurant'}</button>
        </form>
      </section>
    </main>
  );
}

function QueueSettingsPage({ restaurant, onSaved }) {
  const [form, setForm] = useState(null);
  const [hoursText, setHoursText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: restaurant.name,
      isOpen: restaurant.is_open,
      averageWaitMinutes: String(restaurant.avg_wait_minutes),
      maxPartySize: String(restaurant.max_party_size),
      queueLimit: restaurant.queue_limit == null ? '' : String(restaurant.queue_limit),
    });
    setHoursText(JSON.stringify(restaurant.hours ?? {}, null, 2));
  }, [restaurant]);

  async function handleSave(event) {
    event.preventDefault();
    if (!form || isSaving) return;
    setError('');
    setSuccess('');

    let hours;
    try {
      hours = JSON.parse(hoursText);
      if (!hours || typeof hours !== 'object' || Array.isArray(hours)) throw new Error();
    } catch {
      setError('Opening hours must be a valid JSON object.');
      return;
    }

    const averageWaitMinutes = Number(form.averageWaitMinutes);
    const maxPartySize = Number(form.maxPartySize);
    const queueLimit = form.queueLimit === '' ? null : Number(form.queueLimit);
    if (!Number.isInteger(averageWaitMinutes) || averageWaitMinutes < 1 || averageWaitMinutes > 240) {
      setError('Average wait must be between 1 and 240 minutes.');
      return;
    }
    if (!Number.isInteger(maxPartySize) || maxPartySize < 1 || maxPartySize > 100) {
      setError('Maximum party size must be between 1 and 100.');
      return;
    }
    if (queueLimit !== null && (!Number.isInteger(queueLimit) || queueLimit < 1 || queueLimit > 10000)) {
      setError('Queue limit must be blank or between 1 and 10,000 entries.');
      return;
    }

    setIsSaving(true);
    try {
      await updateRestaurantSettings(restaurant.id, {
        ...form,
        name: form.name.trim(),
        hours,
        averageWaitMinutes,
        maxPartySize,
        queueLimit,
      });
      setSuccess('Restaurant settings saved.');
      onSaved();
    } catch (saveError) {
      setError(saveError.message || 'Could not save your settings.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!form) return <p role="status">Loading queue settings…</p>;

  return (
    <section className="staff-panel">
      <div className="staff-panel-toolbar"><div><h2>Restaurant and queue settings</h2><p>Changes apply to new queue entries and guest estimates.</p></div></div>
      <form className="staff-settings-form" onSubmit={handleSave}>
        <label><span>Restaurant name</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={120} required /></label>
        <label className="staff-toggle-row"><span><strong>Accepting guests</strong><small>Guests cannot join while the queue is closed.</small></span><input type="checkbox" checked={form.isOpen} onChange={(event) => setForm((current) => ({ ...current, isOpen: event.target.checked }))} /></label>
        <label><span>Average wait per party ahead (minutes)</span><input type="number" min="1" max="240" value={form.averageWaitMinutes} onChange={(event) => setForm((current) => ({ ...current, averageWaitMinutes: event.target.value }))} required /></label>
        <label><span>Maximum party size</span><input type="number" min="1" max="100" value={form.maxPartySize} onChange={(event) => setForm((current) => ({ ...current, maxPartySize: event.target.value }))} required /></label>
        <label><span>Queue limit <small>Leave blank for no limit</small></span><input type="number" min="1" max="10000" value={form.queueLimit} onChange={(event) => setForm((current) => ({ ...current, queueLimit: event.target.value }))} /></label>
        <label className="staff-hours-field"><span>Opening hours (JSON)</span><textarea rows={7} value={hoursText} onChange={(event) => setHoursText(event.target.value)} spellCheck="false" /></label>
        {error && <p className="staff-error" role="alert">{error}</p>}
        {success && <p className="staff-success" role="status">{success}</p>}
        <button className="staff-button primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save settings'}</button>
      </form>
    </section>
  );
}

function QrCodesPage({ restaurant }) {
  const [tableLabel, setTableLabel] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState('');
  const targetUrl = new URL(`/r/${encodeURIComponent(restaurant.slug)}`, window.location.origin);
  if (tableLabel.trim()) targetUrl.searchParams.set('table', tableLabel.trim());

  useEffect(() => {
    let active = true;
    setError('');
    setQrDataUrl('');
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(targetUrl.toString(), {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
      }))
      .then((dataUrl) => { if (active) setQrDataUrl(dataUrl); })
      .catch(() => { if (active) setError('Could not generate the QR code. Try again.'); });
    return () => { active = false; };
  }, [targetUrl.toString()]);

  return (
    <section className="staff-panel qr-panel">
      <div className="staff-panel-toolbar"><div><h2>Restaurant QR code</h2><p>Print one code for the restaurant, or add a table label for a table-specific code.</p></div></div>
      <label className="qr-table-input"><span>Table label <small>Optional</small></span><input value={tableLabel} maxLength={40} onChange={(event) => setTableLabel(event.target.value)} placeholder="e.g. Table 4" /></label>
      <div className="qr-preview">
        {error ? <p className="staff-error" role="alert">{error}</p> : qrDataUrl ? <img src={qrDataUrl} alt={`QR code for ${restaurant.name}${tableLabel ? `, ${tableLabel}` : ''}`} /> : <p role="status">Generating QR code…</p>}
        <div><strong>{restaurant.name}</strong><span>{tableLabel || 'Restaurant entrance'}</span><code>{targetUrl.toString()}</code></div>
      </div>
      <div className="staff-toolbar-actions qr-actions">
        <a className="staff-button secondary" href={qrDataUrl || undefined} download={`${restaurant.slug}${tableLabel ? `-${tableLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : ''}-qr.png`} aria-disabled={!qrDataUrl}>Download PNG</a>
        <button className="staff-button primary" type="button" onClick={() => window.print()} disabled={!qrDataUrl}>Print QR code</button>
      </div>
    </section>
  );
}

function StaffManagementPage({ restaurant, currentUserId }) {
  const [staff, setStaff] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [retry, setRetry] = useState(0);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [members, pending] = await Promise.all([
        listRestaurantStaff(restaurant.id),
        listStaffInvitations(restaurant.id),
      ]);
      setStaff(members);
      setInvitations(pending);
    } catch (loadError) {
      setError(loadError.message || 'Could not load staff.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurant.id]);

  useEffect(() => { refresh(); }, [refresh, retry]);

  async function handleInvite(event) {
    event.preventDefault();
    if (isInviting) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setSuccess('');
    setIsInviting(true);
    try {
      await inviteRestaurantStaff(restaurant.id, normalizedEmail, role);
      await sendStaffInviteLink(normalizedEmail);
      setEmail('');
      setSuccess(`A secure sign-in link was sent to ${normalizedEmail}.`);
      await refresh();
    } catch (inviteError) {
      setError(inviteError.message || 'Could not invite this staff member.');
      await refresh();
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRemove(member) {
    if (member.user_id === currentUserId) {
      setError('You cannot remove your own access from this screen.');
      return;
    }
    if (!window.confirm(`Remove ${member.email} from ${restaurant.name}?`)) return;
    setError('');
    try {
      await removeRestaurantStaff(restaurant.id, member.user_id);
      await refresh();
    } catch (removeError) {
      setError(removeError.message || 'Could not remove this staff member.');
    }
  }

  return (
    <section className="staff-panel">
      <div className="staff-panel-toolbar"><div><h2>Staff access</h2><p>Invitations are restricted to this restaurant and expire after seven days.</p></div></div>
      <form className="staff-inline-form staff-invite-form" onSubmit={handleInvite}>
        <label><span>Invite by email</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label><span>Role</span><select value={role} onChange={(event) => setRole(event.target.value)}><option value="staff">Staff</option><option value="manager">Manager</option></select></label>
        <button className="staff-button primary" type="submit" disabled={isInviting}>{isInviting ? 'Sending…' : 'Send invite'}</button>
      </form>
      {error && <p className="staff-error" role="alert">{error}</p>}
      {success && <p className="staff-success" role="status">{success}</p>}
      {isLoading ? <div className="staff-skeleton-list" role="status"><div /><div /></div> : (
        <>
          <h3 className="staff-list-heading">Current members</h3>
          {staff.length === 0 ? <PageStatus title="No staff members yet" /> : (
            <div className="staff-member-list">
              {staff.map((member) => (
                <div className="staff-member-row" key={member.user_id}>
                  <div><strong>{member.email}</strong><span>{member.role}</span></div>
                  <div>
                    {member.role === 'owner' ? <span className="staff-role-pill">Owner</span> : (
                      <button className="staff-button quiet" type="button" onClick={() => handleRemove(member)}>Remove</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <h3 className="staff-list-heading">Invitations</h3>
          {invitations.length === 0 ? <p className="staff-muted">No invitations yet.</p> : (
            <div className="staff-member-list">
              {invitations.map((invite) => (
                <div className="staff-member-row" key={invite.id}>
                  <div><strong>{invite.email}</strong><span>{invite.role} · expires {new Date(invite.expires_at).toLocaleDateString()}</span></div>
                  <span className={`staff-status-badge ${invite.accepted_at ? 'status-seated' : 'status-waiting'}`}>{invite.accepted_at ? 'Accepted' : 'Pending'}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {error && <RetryButton onClick={() => setRetry((count) => count + 1)} />}
    </section>
  );
}

function AnalyticsPage({ restaurant }) {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  const refresh = useCallback(async () => {
    setError('');
    setIsLoading(true);
    try {
      setRecords(await getTodayQueueEntries(restaurant.id));
    } catch (loadError) {
      setError(loadError.message || 'Could not load analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurant.id]);

  useEffect(() => { refresh(); }, [refresh, retry]);

  const metrics = useMemo(() => {
    const guests = records.reduce((sum, record) => sum + record.party_size, 0);
    const seated = records.filter((record) => record.status === 'SEATED');
    const noShows = records.filter((record) => record.status === 'NO_SHOW').length;
    const waits = seated
      .filter((record) => record.created_at && record.seated_at)
      .map((record) => (new Date(record.seated_at) - new Date(record.created_at)) / 60000)
      .filter((minutes) => Number.isFinite(minutes) && minutes >= 0);
    const averageWait = waits.length
      ? Math.round(waits.reduce((sum, minutes) => sum + minutes, 0) / waits.length)
      : null;

    return {
      guests,
      averageWait,
      seatedRate: records.length ? Math.round((seated.length / records.length) * 100) : null,
      noShows,
      queueEntries: records.length,
    };
  }, [records]);

  return (
    <section className="staff-panel">
      <div className="staff-panel-toolbar">
        <div><h2>Today at {restaurant.name}</h2><p>Calculated from this restaurant’s queue records created today in your local timezone.</p></div>
        <button className="staff-button secondary" type="button" onClick={() => setRetry((count) => count + 1)}>Refresh</button>
      </div>
      {isLoading ? <div className="staff-skeleton-list" role="status"><div /><div /><div /></div> : error ? (
        <PageStatus title="Analytics unavailable" action={<RetryButton onClick={() => setRetry((count) => count + 1)} />}>{error}</PageStatus>
      ) : metrics.queueEntries === 0 ? (
        <PageStatus title="No analytics yet">Queue metrics will appear after guests join today.</PageStatus>
      ) : (
        <div className="staff-analytics-grid">
          <MetricCard title="Guests today" value={metrics.guests} detail={`${metrics.queueEntries} queue entries`} />
          <MetricCard title="Average wait" value={metrics.averageWait == null ? '—' : `${metrics.averageWait} min`} detail="Completed seated entries" />
          <MetricCard title="Seated rate" value={`${metrics.seatedRate}%`} detail="Seated entries ÷ all entries" />
          <MetricCard title="No-shows" value={metrics.noShows} detail="Marked no-show today" />
        </div>
      )}
    </section>
  );
}

function MetricCard({ title, value, detail }) {
  return <article className="staff-metric-card"><span>{title}</span><strong>{value}</strong><small>{detail}</small></article>;
}
