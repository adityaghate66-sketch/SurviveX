import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../AuthShell.jsx';
import { useAuth } from '../context/useAuth.js';

export default function SignUpPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await signUp(form);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      if (requestError.code === 'REGISTERED_NOT_SIGNED_IN') {
        navigate('/login', {
          replace: true,
          state: { notice: 'Account created. Sign in to continue.' },
        });
        return;
      }
      setError(requestError.message || 'Unable to create your account right now.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="JOIN THE MISSION"
      title="Create your account"
      subtitle="One identity for every scenario you enter."
      footer={
        <p>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      }
    >
      <form className="sx-form" onSubmit={submit} noValidate>
        {error ? (
          <p className="sx-form__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="sx-field">
          <label htmlFor="signup-username">Username</label>
          <input
            id="signup-username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="3–32 letters, numbers, _ or -"
            value={form.username}
            onChange={update}
            required
          />
        </div>

        <div className="sx-field">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
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
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={update}
            required
          />
        </div>

        <div className="sx-field">
          <label htmlFor="signup-confirm">Confirm password</label>
          <input
            id="signup-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={update}
            required
          />
        </div>

        <button
          className="sx-btn sx-btn--primary sx-btn--block"
          type="submit"
          disabled={busy}
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>

        <p className="sx-form__hint">
          By creating an account you agree to use SurviveX responsibly. Guest
          play remains available <a href="/">without an account</a>.
        </p>
      </form>
    </AuthShell>
  );
}
