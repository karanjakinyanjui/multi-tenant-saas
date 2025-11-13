import { Router } from 'express';
import { ParticipantController } from '../controllers/participantController';
import { extractTenantFromToken, requireRole } from '../middleware/tenantIsolation';

const router = Router();

// All routes require authentication
router.use(extractTenantFromToken);

router.post('/', requireRole(['tenant-admin', 'tenant-user']), ParticipantController.createParticipant);
router.get('/', requireRole(['tenant-admin', 'tenant-user']), ParticipantController.listParticipants);
router.get('/statistics', requireRole(['tenant-admin', 'tenant-user']), ParticipantController.getStageStatistics);
router.get('/:id', requireRole(['tenant-admin', 'tenant-user']), ParticipantController.getParticipant);
router.put('/:id', requireRole(['tenant-admin', 'tenant-user']), ParticipantController.updateParticipant);
router.delete('/:id', requireRole(['tenant-admin']), ParticipantController.deleteParticipant);
router.get('/:id/funnel', requireRole(['tenant-admin', 'tenant-user']), ParticipantController.getParticipantFunnel);
router.post('/:id/advance', requireRole(['tenant-admin', 'tenant-user']), ParticipantController.advanceStage);

export default router;
