// There is no avatar field in the User model yet, so the initial is derived
// from the username. No image is invented or loaded from a third party.
export default function Avatar({ username, size = 'md' }) {
  const initial = (username || 'P').charAt(0).toUpperCase();
  return (
    <span className={`sx-avatar sx-avatar--${size}`} aria-hidden="true">
      {initial}
    </span>
  );
}
