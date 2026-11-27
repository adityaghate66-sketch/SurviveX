import { Link } from 'react-router-dom';
import AuthShell from '../AuthShell.jsx';

// There is no password-reset endpoint on the API yet. Show an honest state
// instead of a form that pretends to send a reset email.
export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="ACCOUNT RECOVERY"
      title="Reset your password"
      subtitle="Self-service password reset is not available yet."
      footer={
        <p>
          Remembered it? <Link to="/login">Back to sign in</Link>
        </p>
      }
    >
      <div className="sx-notice" role="status">
        <span className="sx-notice__icon" aria-hidden="true">
          !
        </span>
        <div>
          <strong>We can&apos;t reset passwords automatically yet.</strong>
          <p>
            Password recovery is still being built. Until it is live, no reset
            email will be sent from this page — please do not re-enter your
            password anywhere else.
          </p>
        </div>
      </div>

      <div className="sx-auth__choices">
        <Link className="sx-btn sx-btn--primary sx-btn--block" to="/login">
          Back to sign in
        </Link>
        <Link className="sx-btn sx-btn--ghost sx-btn--block" to="/signup">
          Create a new account
        </Link>
      </div>

      <p className="sx-form__hint">
        You can always <a href="/">enter the world as a guest</a> while account
        recovery is being finished.
      </p>
    </AuthShell>
  );
}
