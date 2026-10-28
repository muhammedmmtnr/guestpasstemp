import { useEffect, useState } from 'react';
import { adminUsersApi, isSensitiveField } from './api';

function formatLabel(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (character) => character.toUpperCase());
}

function UserValue({ value }) {
  if (value === null || value === undefined || value === '') {
    return <span className="user-detail-empty">—</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="user-detail-empty">—</span>;
    }

    return (
      <ul className="user-detail-list">
        {value.map((item, index) => (
          <li key={index}><UserValue value={item} /></li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([key]) => !isSensitiveField(key));

    if (entries.length === 0) {
      return <span className="user-detail-empty">—</span>;
    }

    return (
      <dl className="user-detail-nested">
        {entries.map(([key, item]) => (
          <div className="user-detail-field" key={key}>
            <dt>{formatLabel(key)}</dt>
            <dd><UserValue value={item} /></dd>
          </div>
        ))}
      </dl>
    );
  }

  if (typeof value === 'boolean') {
    return <span>{value ? 'Yes' : 'No'}</span>;
  }

  return <span>{String(value)}</span>;
}

function UserDetailsPage({ userId }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUser() {
      setIsLoading(true);
      setError('');

      try {
        const payload = await adminUsersApi.get(userId, { signal: controller.signal });
        setUser(payload);
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message || 'Could not load this user. Check the API connection and try again.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadUser();
    return () => controller.abort();
  }, [userId, retryKey]);

  const userEntries = user && typeof user === 'object' && !Array.isArray(user)
    ? Object.entries(user).filter(([key]) => !isSensitiveField(key))
    : null;
  const requestedReturnTo = new URLSearchParams(window.location.search).get('from');
  const returnTo = requestedReturnTo && /^\/admin\/users(?:\?|$)/.test(requestedReturnTo)
    ? requestedReturnTo
    : '/admin/users';

  return (
    <main className="user-details-page">
      <a className="user-details-back" href={returnTo}>← Back to users</a>
      <section className="user-details-card" aria-labelledby="user-details-title">
        <div className="user-details-heading">
          <div className="user-details-avatar" aria-hidden="true">U</div>
          <div>
            <p className="user-details-eyebrow">Admin / Users</p>
            <h1 id="user-details-title">User Details</h1>
            <p className="user-details-id">ID: {userId}</p>
          </div>
        </div>

        {isLoading ? (
          <p className="user-details-message" role="status">Loading user details…</p>
        ) : error ? (
          <div className="user-details-error" role="alert">
            <strong>Unable to load user</strong>
            <p>{error}</p>
            <button type="button" className="user-management-retry" onClick={() => setRetryKey((current) => current + 1)}>
              Retry
            </button>
          </div>
        ) : userEntries ? (
          userEntries.length > 0 ? (
            <dl className="user-details-fields">
              {userEntries.map(([key, value]) => (
                <div className="user-detail-field" key={key}>
                  <dt>{formatLabel(key)}</dt>
                  <dd><UserValue value={value} /></dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="user-details-message">No user details were returned.</p>
          )
        ) : (
          <div className="user-details-raw">
            <UserValue value={user} />
          </div>
        )}
        {!isLoading && !error && user !== null && (
          <div className="user-detail-actions">
            <h2>Admin actions</h2>
            <button type="button" disabled title="Backend status values and request body are not documented.">
              Update status
            </button>
            <button type="button" disabled title="Current-user identity and self-deletion rules are not documented.">
              Delete user
            </button>
            <p>
              Actions are disabled until the backend documents allowed status values,
              the status request body, current-user identity, and self-deletion rules.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

export default UserDetailsPage;
