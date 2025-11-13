import { Router } from 'express';
import { TenantController } from '../controllers/tenantController';
import { extractTenantFromToken, requireRole, validateTenantAccess } from '../middleware/tenantIsolation';

const router = Router();

// Public routes (super-admin only)
router.post('/', requireRole(['super-admin']), TenantController.createTenant);
router.get('/', requireRole(['super-admin']), TenantController.listTenants);

// Protected routes (require authentication)
router.use(extractTenantFromToken);
router.use(validateTenantAccess);

router.get('/:id', TenantController.getTenant);
router.put('/:id', requireRole(['super-admin', 'tenant-admin']), TenantController.updateTenant);
router.delete('/:id', requireRole(['super-admin']), TenantController.deleteTenant);
router.get('/:id/metrics', TenantController.getTenantMetrics);

export default router;
