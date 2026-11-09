const API_BASE = '/api';

async function request(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
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
