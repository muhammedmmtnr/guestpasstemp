import { useEffect, useMemo, useState } from 'react';
import {
  adaptUserListResponse,
  adminUsersApi,
  getUserRecordId,
  isSensitiveField,
} from './api';

function readListOptions() {
  const params = new URLSearchParams(window.location.search);
  const page = Number(params.get('page')) || 1;
  const limit = Number(params.get('limit')) || 20;

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: Number.isInteger(limit) && limit > 0 ? limit : 20,
    accountType: params.get('accountType') || 'all',
  };
}

function formatLabel(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (character) => character.toUpperCase());
}

function safeDisplayValue(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => safeDisplayValue(item)).join(', ') || '—';
  }
  if (typeof value === 'object') {
    const visibleFields = Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !isSensitiveField(key))
        .map(([key, item]) => [key, safeDisplayValue(item)]),
    );
    return Object.keys(visibleFields).length > 0 ? JSON.stringify(visibleFields) : '—';
  }
  return String(value);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function UserManagementPage({ onSignOut }) {
  const [options, setOptions] = useState(readListOptions);
  const [accountTypeDraft, setAccountTypeDraft] = useState(options.accountType);
  const [limitDraft, setLimitDraft] = useState(String(options.limit));
  const [search, setSearch] = useState('');
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError('');
    setErrorStatus(null);
    setPayload(null);

    adminUsersApi.list(options, { signal: controller.signal })
      .then(setPayload)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message || 'Could not load users. Check the API connection and try again.');
          setErrorStatus(requestError.status || null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [options, retryKey]);

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(options.page),
      limit: String(options.limit),
      accountType: options.accountType,
    });
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
  }, [options]);

  useEffect(() => {
    function syncOptionsFromUrl() {
      const nextOptions = readListOptions();
      setOptions(nextOptions);
      setAccountTypeDraft(nextOptions.accountType);
      setLimitDraft(String(nextOptions.limit));
    }

    window.addEventListener('popstate', syncOptionsFromUrl);
    return () => window.removeEventListener('popstate', syncOptionsFromUrl);
  }, []);

  const adapted = useMemo(() => adaptUserListResponse(payload), [payload]);
  const users = adapted.users;
  const safeUsers = users?.filter(isRecord) ?? [];
  const columns = [...new Set(safeUsers.flatMap((user) => Object.keys(user)))]
    .filter((key) => !isSensitiveField(key));
  const visibleUsers = safeUsers.filter((user) => (
    !search || JSON.stringify(user).toLowerCase().includes(search.toLowerCase())
  ));
  const returnTo = `${window.location.pathname}${window.location.search}`;

  function applyFilters(event) {
    event.preventDefault();
    const limit = Number(limitDraft);

    if (!Number.isInteger(limit) || limit < 1) {
      setError('Page size must be a positive whole number.');
      setErrorStatus(null);
      return;
    }

    setError('');
    setErrorStatus(null);
    setOptions({
      page: 1,
      limit,
      accountType: accountTypeDraft.trim() || 'all',
    });
  }

  function changePage(page) {
    setOptions((current) => ({ ...current, page }));
  }

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setSignOutError('');
    try {
      await onSignOut();
      window.location.replace('/sign-in');
    } catch {
      setSignOutError('Could not clear the local session. Please try again.');
      setIsSigningOut(false);
    }
  }

  return (
    <main className="user-management-page">
      <a className="user-details-back" href="/">← Back to dashboard</a>
      <section className="user-management-card" aria-labelledby="user-management-title">
        <div className="user-management-heading">
          <div>
            <p className="user-details-eyebrow">Admin / Users</p>
            <h1 id="user-management-title">User Management</h1>
            <p className="user-management-description">
              User records and pagination are shown from the admin API response.
            </p>
          </div>
          <div className="user-management-header-actions">
            <button type="button" className="user-management-refresh" onClick={() => setRetryKey((current) => current + 1)}>
              Refresh
            </button>
            <button type="button" className="user-management-refresh" onClick={handleSignOut} disabled={isSigningOut}>
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>

        {signOutError && <p className="user-details-error" role="alert">{signOutError}</p>}

        <form className="user-management-filters" onSubmit={applyFilters}>
          <label>
            <span>Account type value</span>
            <input
              value={accountTypeDraft}
              onChange={(event) => setAccountTypeDraft(event.target.value)}
              placeholder="all"
            />
          </label>
          <label>
            <span>Page size</span>
            <input
              type="number"
              min="1"
              step="1"
              value={limitDraft}
              onChange={(event) => setLimitDraft(event.target.value)}
            />
          </label>
          <button type="submit" className="user-management-apply" disabled={isLoading}>
            Apply
          </button>
          <label className="user-management-search">
            <span>Search this page only</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search returned records"
            />
          </label>
        </form>

        <div className="user-management-meta" aria-live="polite">
          {!isLoading && users && (
            <span>{users.length} record{users.length === 1 ? '' : 's'} returned on this page</span>
          )}
          {adapted.metadata && (
            <span>Pagination metadata: {safeDisplayValue(adapted.metadata)}</span>
          )}
          <span>Page {options.page}</span>
        </div>

        {isLoading ? (
          <div className="user-table-loading" role="status" aria-label="Loading users">
            {Array.from({ length: 5 }, (_, index) => (
              <div className="user-table-skeleton" key={index} />
            ))}
          </div>
        ) : error ? (
          <div className="user-details-error" role="alert">
            <strong>Unable to load users</strong>
            <p>{error}</p>
            {errorStatus === 401 ? (
              <p>The sign-in page can establish a Supabase Auth session. Check the project configuration and sign in again.</p>
            ) : null}
            <button type="button" className="user-management-retry" onClick={() => setRetryKey((current) => current + 1)}>
              Retry
            </button>
          </div>
        ) : users === null ? (
          <div className="user-management-empty">
            <h2>Unrecognized users response</h2>
            <p>
              Expected a user array or a documented data/users/items/results array.
              The API returned top-level keys: {adapted.responseKeys.join(', ') || 'none'}.
            </p>
            <p>Provide the real list response schema to map this endpoint accurately.</p>
          </div>
        ) : visibleUsers.length === 0 ? (
          <div className="user-management-empty">
            <h2>{users.length === 0 ? 'No users on this page' : 'No matching users'}</h2>
            <p>{users.length === 0 ? 'The API returned no user records for these filters.' : 'Try a different search term.'}</p>
          </div>
        ) : (
          <div className="user-management-table-wrap">
            <table className="user-management-table">
              <thead>
                <tr>
                  {columns.map((column) => <th key={column}>{formatLabel(column)}</th>)}
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user, index) => {
                  const userId = getUserRecordId(user);
                  return (
                    <tr key={userId || index}>
                      {columns.map((column) => (
                        <td key={column}>{safeDisplayValue(user[column])}</td>
                      ))}
                      <td>
                        {userId ? (
                          <a
                            className="user-management-view"
                            href={`/admin/users/${encodeURIComponent(userId)}?${new URLSearchParams({ from: returnTo })}`}
                          >
                            View
                          </a>
                        ) : (
                          <span className="user-management-muted">No recognized ID</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <nav className="user-management-pagination" aria-label="User list pagination">
          <button type="button" onClick={() => changePage(options.page - 1)} disabled={isLoading || options.page <= 1}>
            Previous
          </button>
          <span>Page {options.page}</span>
          <button
            type="button"
            onClick={() => changePage(options.page + 1)}
            disabled={isLoading || users === null || users.length < options.limit}
          >
            Next
          </button>
        </nav>

        <p className="user-management-contract-note">
          Status changes and deletion are unavailable until the backend documents
          allowed status values, the status request body, current-user identity,
          and self-deletion rules.
        </p>
      </section>
    </main>
  );
}

export default UserManagementPage;
