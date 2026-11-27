import { signAccessToken } from "../config/auth.js";
import {
  authenticatePlayer,
  getPlayerById,
  registerPlayer,
  revokeToken,
} from "../services/authService.js";

export async function register(req, res) {
  const player = await registerPlayer(req.body);
  res.status(201).json({ success: true, data: player });
}

export async function login(req, res) {
  const player = await authenticatePlayer(req.body);
  const token = signAccessToken(player);
  res.json({
    success: true,
    data: { token, tokenType: "Bearer", player },
  });
}

export async function logout(req, res) {
  await revokeToken(req.auth.jti, req.auth.expiresAt);
  res.json({ success: true, data: { loggedOut: true } });
}

export async function me(req, res) {
  // Read from the database rather than trusting the token's stale username.
  const player = await getPlayerById(req.user.id);
  res.json({ success: true, data: player });
}
