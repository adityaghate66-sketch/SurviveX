// One-time entry gate for the game route.
//
// This is tab-scoped on purpose: opening the game in a new tab should show the
// welcome screen again, while reloading after entering should not. It stores no
// account data — only whether the player chose to enter the world.

const ENTRY_KEY = 'survivex.enteredWorld';

export function hasEnteredWorld() {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(ENTRY_KEY) === '1';
  } catch {
    return false;
  }
}

export function markEnteredWorld() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(ENTRY_KEY, '1');
  } catch {
    // Private mode / quota: the in-memory state still opens the game for this
    // page view, so the player is never stuck behind the gate.
  }
}
