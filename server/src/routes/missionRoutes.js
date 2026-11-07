import { Router } from 'express';
import { getMissions, getMission } from '../controllers/missionController.js';

const router = Router();

router.get('/', getMissions);
router.get('/:id', getMission);

export default router;
