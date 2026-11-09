// Dev falls back to '/api' (handled by the Vite proxy); production reads the
// Render URL from VITE_API_BASE_URL, which Vite bakes in at build time.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

// A render-blocking request must never hang forever (a cold Render instance can
// take a while). Timing out surfaces the same "unreachable" path as an outage.
const REQUEST_TIMEOUT_MS = 12000;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.name === 'AbortError' ? 'Request timed out' : error.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function getHealth() {
  return request('/health');
}

export async function getMissions() {
  return request('/missions');
}

// Creates a game session, or returns the player's existing active session for
// the same mission. Safe to call more than once (React StrictMode does).
export async function createSession({ userId, username, missionId, missionCode } = {}) {
  return request('/sessions', {
    method: 'POST',
    body: JSON.stringify({ userId, username, missionId, missionCode }),
  });
}

export async function getSessionProgress(sessionId) {
  return request(`/sessions/${encodeURIComponent(sessionId)}/progress`);
}

// The server owns progress: it only sends the zone that was discovered and
// validates/calculates everything else.
export async function updateSessionProgress(sessionId, zoneId) {
  return request(`/sessions/${encodeURIComponent(sessionId)}/progress`, {
    method: 'PUT',
    body: JSON.stringify({ zoneId }),
  });
}

export async function completeSession(sessionId) {
  return request(`/sessions/${encodeURIComponent(sessionId)}/complete`, {
    method: 'POST',
  });
}
