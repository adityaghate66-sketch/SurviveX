// Token persistence for the public site only.
//
// Only a bearer token and the safe player shape returned by the API are stored.
// Passwords are never written to either storage area. "Remember me" chooses
// localStorage (persists after the browser closes) vs sessionStorage (tab only).

const STORAGE_KEY = 'survivex.auth';

function readFrom(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.token !== 'string' || !parsed.token) return null;
    return {
      token: parsed.token,
      player: parsed.player ?? null,
      remember: Boolean(parsed.remember),
    };
  } catch {
    return null;
  }
}

/** A remembered session wins over a tab-only one. */
export function readSession() {
  if (typeof window === 'undefined') return null;
  return readFrom(window.localStorage) || readFrom(window.sessionStorage);
}

export function writeSession({ token, player, remember }) {
  if (typeof window === 'undefined') return;
  clearSession();
  const value = JSON.stringify({
    token,
    player: player ?? null,
    remember: Boolean(remember),
  });
  try {
    (remember ? window.localStorage : window.sessionStorage).setItem(
      STORAGE_KEY,
      value
    );
  } catch {
    // Storage can be blocked (private mode / quota). The in-memory state still
    // works for this tab; the player simply has to sign in again next visit.
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
