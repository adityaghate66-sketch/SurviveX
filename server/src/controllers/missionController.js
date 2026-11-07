import { listMissions, getMissionByIdOrCode } from '../services/missionService.js';

export async function getMissions(_req, res) {
  const missions = await listMissions();
  res.json({ success: true, data: missions });
}

export async function getMission(req, res) {
  const mission = await getMissionByIdOrCode(req.params.id);
  res.json({ success: true, data: mission });
}
