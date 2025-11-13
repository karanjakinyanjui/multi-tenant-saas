import { Router, Response } from 'express';
import { TenantRequest, extractTenantFromToken, requireRole } from '../middleware/tenantIsolation';
import { CostService } from '../services/costService';
import { logger } from '../utils/logger';

const router = Router();

router.use(extractTenantFromToken);

router.get('/report', requireRole(['super-admin', 'tenant-admin']), async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, startDate, endDate } = req.query;

    const effectiveTenantId = req.userRole === 'super-admin' ? (tenantId as string) : req.tenantId;

    if (!effectiveTenantId) {
      res.status(400).json({ error: 'Tenant ID is required' });
      return;
    }

    const report = await CostService.generateCostReport(
      effectiveTenantId,
      startDate as string,
      endDate as string
    );

    res.json(report);
  } catch (error) {
    logger.error('Error generating cost report:', error);
    res.status(500).json({ error: 'Failed to generate cost report' });
  }
});

router.get('/summary', requireRole(['super-admin']), async (req: TenantRequest, res: Response) => {
  try {
    const summary = await CostService.getAllTenantsCostSummary();
    res.json(summary);
  } catch (error) {
    logger.error('Error generating cost summary:', error);
    res.status(500).json({ error: 'Failed to generate cost summary' });
  }
});

export default router;
