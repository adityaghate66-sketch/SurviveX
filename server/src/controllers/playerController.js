import { getPlayerSummary } from "../services/playerService.js";

export async function summary(req, res) {
  // req.user is attached by requireAuth from a verified token.
  const data = await getPlayerSummary(req.user.id);
  res.json({ success: true, data });
}
