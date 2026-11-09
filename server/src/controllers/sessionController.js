import {
  completeGameSession,
  createOrGetSession,
  getMissionProgress,
  updateMissionProgress,
} from "../services/sessionService.js";

// Every response uses the same envelope as the rest of the API:
//   success -> { success: true, data }
//   failure -> handled centrally by errorHandler: { success: false, error }

export async function createSession(req, res) {
  const session = await createOrGetSession(req.body);
  const statusCode = session.reused ? 200 : 201;
  res.status(statusCode).json({ success: true, data: session });
}

export async function updateProgress(req, res) {
  const progress = await updateMissionProgress(
    req.params.sessionId,
    req.body
  );
  res.json({ success: true, data: progress });
}

export async function getProgress(req, res) {
  const progress = await getMissionProgress(req.params.sessionId);
  res.json({ success: true, data: progress });
}

export async function completeSession(req, res) {
  const completion = await completeGameSession(req.params.sessionId);
  res.json({ success: true, data: completion });
}
