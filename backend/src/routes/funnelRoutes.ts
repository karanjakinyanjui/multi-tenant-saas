import { Router } from 'express';
import { ParticipantController } from '../controllers/participantController';
import { extractTenantFromToken, requireRole } from '../middleware/tenantIsolation';

const router = Router();

// All routes require authentication
router.use(extractTenantFromToken);

router.get('/statistics', requireRole(['tenant-admin', 'tenant-user']), ParticipantController.getStageStatistics);

export default router;
