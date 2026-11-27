import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../AuthShell.jsx';
import { useAuth } from '../context/useAuth.js';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(form);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in right now.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="WELCOME BACK"
      title="Sign in to SurviveX"
      subtitle="Pick up where you left off. Your next scenario is waiting."
      footer={
        <p>
          New here? <Link to="/signup">Create an account</Link>
        </p>
      }
    >
      <form className="sx-form" onSubmit={submit} noValidate>
        {location.state?.notice ? (
          <p className="sx-form__notice" role="status">
            {location.state.notice}
          </p>
        ) : null}

        {error ? (
          <p className="sx-form__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="sx-field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={update}
            required
          />
        </div>

        <div className="sx-field">
          <div className="sx-field__label-row">
            <label htmlFor="login-password">Password</label>
            <Link className="sx-field__aside" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={form.password}
            onChange={update}
            required
          />
        </div>

        <label className="sx-checkbox">
          <input
            name="remember"
            type="checkbox"
            checked={form.remember}
            onChange={update}
          />
          <span>Remember me on this device</span>
        </label>

        <button
          className="sx-btn sx-btn--primary sx-btn--block"
          type="submit"
          disabled={busy}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="sx-form__hint">
          Just want to play? You can still{' '}
          <a href="/">enter the world as a guest</a>.
        </p>
      </form>
    </AuthShell>
  );
}
