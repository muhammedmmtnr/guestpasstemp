import { useState } from 'react';
import { ADMIN_ACCOUNT_TYPE_CONTRACT, buildAdminSignUpPayload } from './adminAuth';
import { authApi } from './api';

function AdminCreatePage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    setError('');
    setSuccess('');
    if (!ADMIN_ACCOUNT_TYPE_CONTRACT) {
      setError('Admin creation is unavailable until the backend confirms the account type field and value.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildAdminSignUpPayload(form, ADMIN_ACCOUNT_TYPE_CONTRACT);
      await authApi.signUp(payload, { authMode: 'admin' });
      setForm({ name: '', email: '', password: '' });
      setSuccess('Admin account created.');
    } catch (requestError) {
      setError(requestError.message || 'Could not create the admin account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="user-management-page">
      <a className="user-details-back" href="/admin/users">← Back to users</a>
      <section className="user-details-card" aria-labelledby="create-admin-title">
        <div className="user-details-heading">
          <div className="user-details-avatar" aria-hidden="true">A</div>
          <div>
            <p className="user-details-eyebrow">Admin / Users</p>
            <h1 id="create-admin-title">Create an admin</h1>
            <p className="user-details-id">This form is available only in an authenticated admin session.</p>
          </div>
        </div>
        {error && <p className="user-details-error" role="alert">{error}</p>}
        {success && <p className="user-management-success" role="status">{success}</p>}
        {!ADMIN_ACCOUNT_TYPE_CONTRACT && (
          <p className="user-management-contract-note" role="note">
            Creation is disabled until the backend confirms which field and value identify an admin.
          </p>
        )}
        <form className="sign-in-form" onSubmit={handleSubmit}>
          <label>
            <span>Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              autoComplete="name"
              maxLength={120}
              required
              disabled={isSubmitting}
            />
          </label>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              autoComplete="email"
              required
              disabled={isSubmitting}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              autoComplete="new-password"
              minLength={8}
              required
              disabled={isSubmitting}
            />
          </label>
          <button
            type="submit"
            className="user-management-apply"
            disabled={isSubmitting || !ADMIN_ACCOUNT_TYPE_CONTRACT}
            title={!ADMIN_ACCOUNT_TYPE_CONTRACT ? 'Unavailable until the backend confirms the admin account type.' : undefined}
          >
            {isSubmitting ? 'Creating admin…' : 'Create admin'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default AdminCreatePage;
