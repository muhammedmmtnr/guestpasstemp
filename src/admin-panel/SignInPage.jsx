import { useState } from 'react';
import { useAdminAuth } from './AdminAuthProvider';

function getReturnPath() {
  const requestedPath = new URLSearchParams(window.location.search).get('from');
  if (requestedPath === '/admin' || requestedPath?.startsWith('/admin/')) {
    return requestedPath;
  }

  return '/admin';
}

function SignInPage() {
  const { signIn } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reason = new URLSearchParams(window.location.search).get('reason');

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await signIn(email.trim(), password);
      setPassword('');
      window.location.replace(getReturnPath());
    } catch (signInError) {
      setError(signInError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="user-details-page sign-in-page">
      <section className="user-details-card sign-in-card" aria-labelledby="sign-in-title">
        <div className="user-details-heading">
          <div className="user-details-avatar" aria-hidden="true">G</div>
          <div>
            <p className="user-details-eyebrow">GuestPass Admin</p>
            <h1 id="sign-in-title">Sign in</h1>
            <p className="user-details-id">Sign in with your super admin account.</p>
          </div>
        </div>

        {reason === 'expired' && (
          <p className="sign-in-notice" role="status">
            Your session expired or was rejected. Please sign in again.
          </p>
        )}
        {error && <p className="user-details-error" role="alert">{error}</p>}
        <form className="sign-in-form" onSubmit={handleSubmit}>
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
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </label>
          <button type="submit" className="user-management-apply" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default SignInPage;
