import { useState } from 'react';
import { isSuperAdminExistsError, useAdminAuth } from './AdminAuthProvider';

function SetupPage() {
  const { bootstrap } = useAdminAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await bootstrap(name.trim(), email.trim(), password, setupKey);
      setPassword('');
      setConfirmPassword('');
      setSetupKey('');
      window.location.replace('/admin');
    } catch (bootstrapError) {
      if (isSuperAdminExistsError(bootstrapError)) {
        window.location.replace('/admin/login');
        return;
      }
      setError(bootstrapError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="user-details-page sign-in-page">
      <section className="user-details-card sign-in-card" aria-labelledby="setup-title">
        <div className="user-details-heading">
          <div className="user-details-avatar" aria-hidden="true">G</div>
          <div>
            <p className="user-details-eyebrow">GuestPass Admin</p>
            <h1 id="setup-title">Initial super admin setup</h1>
            <p className="user-details-id">This protected setup can be used only once.</p>
          </div>
        </div>

        {error && <p className="user-details-error" role="alert">{error}</p>}
        <form className="sign-in-form" onSubmit={handleSubmit}>
          <label>
            <span>Name</span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={120}
              disabled={isSubmitting}
            />
          </label>
          <label>
            <span>Email</span>
            <input
              type="email"
              name="email"
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
              name="new-password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              disabled={isSubmitting}
            />
          </label>
          <label>
            <span>Confirm password</span>
            <input
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              disabled={isSubmitting}
            />
          </label>
          <label>
            <span>Setup key</span>
            <input
              type="password"
              name="setup-key"
              autoComplete="off"
              value={setupKey}
              onChange={(event) => setSetupKey(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </label>
          <button type="submit" className="user-management-apply" disabled={isSubmitting}>
            {isSubmitting ? 'Creating super admin…' : 'Create super admin'}
          </button>
        </form>
        <p className="user-management-contract-note">
          Already set up? <a href="/admin/login">Sign in</a>
        </p>
      </section>
    </main>
  );
}

export default SetupPage;
