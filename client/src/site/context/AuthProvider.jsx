import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getMe,
  loginPlayer,
  logoutPlayer,
  registerPlayer,
} from '../../services/api.js';
import {
  clearSession,
  readSession,
  writeSession,
} from '../services/authStorage.js';
import { AuthContext } from './authContext.js';

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readSession()?.token ?? null);
  const [player, setPlayer] = useState(() => readSession()?.player ?? null);
  // `ready` avoids flashing "Sign in" before a stored token is validated. With
  // no stored session there is nothing to validate, so start ready.
  const [ready, setReady] = useState(() => !readSession());

  useEffect(() => {
    let active = true;
    const saved = readSession();

    if (!saved) return undefined;

    // Revalidate on load: the token may be expired or revoked (logged out on
    // another tab). Refresh the safe player shape from the database as well.
    getMe(saved.token)
      .then((freshPlayer) => {
        if (!active) return;
        setPlayer(freshPlayer);
        writeSession({ ...saved, player: freshPlayer });
      })
      .catch(() => {
        if (!active) return;
        clearSession();
        setToken(null);
        setPlayer(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async ({ email, password, remember }) => {
    const result = await loginPlayer({ email, password });
    writeSession({
      token: result.token,
      player: result.player,
      remember,
    });
    setToken(result.token);
    setPlayer(result.player);
    return result.player;
  }, []);

  const signUp = useCallback(
    async (payload) => {
      await registerPlayer(payload);
      // Registration returns the player but no token, so sign straight in to
      // avoid a redundant second form. If that step fails the account still
      // exists, and the page sends the player to the login form.
      try {
        return await signIn({
          email: payload.email,
          password: payload.password,
          remember: true,
        });
      } catch {
        const error = new Error('Account created. Please sign in.');
        error.code = 'REGISTERED_NOT_SIGNED_IN';
        throw error;
      }
    },
    [signIn]
  );

  const signOut = useCallback(async () => {
    const currentToken = token;
    // Revoke server-side, but clear locally even if the API is unreachable.
    try {
      if (currentToken) await logoutPlayer(currentToken);
    } catch {
      /* ignore */
    }
    clearSession();
    setToken(null);
    setPlayer(null);
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      player,
      ready,
      isAuthenticated: Boolean(token),
      signIn,
      signUp,
      signOut,
    }),
    [token, player, ready, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
