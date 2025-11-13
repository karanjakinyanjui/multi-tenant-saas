import { Response } from 'express';
import { TenantRequest } from '../middleware/tenantIsolation';
import { TenantModel } from '../models/Tenant';
import { TenantService } from '../services/tenantService';
import { logger } from '../utils/logger';

export class TenantController {
  static async createTenant(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { name, email, tier = 'basic', quotas } = req.body;

      if (!name || !email) {
        res.status(400).json({ error: 'Name and email are required' });
        return;
      }

      // Generate namespace name
      const namespace = `tenant-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;

      const tenant = await TenantModel.create({
        name,
        namespace,
        email,
        status: 'pending',
        tier,
        quotas: quotas || {
          cpu: '2',
          memory: '4Gi',
          storage: '10Gi',
          maxParticipants: 100
        },
        settings: {}
      });

      // Provision Kubernetes resources
      await TenantService.provisionNamespace(tenant);

      // Update status to active
      const activeTenant = await TenantModel.update(tenant.id, { status: 'active' });

      logger.info(`Tenant created: ${activeTenant.id}, namespace: ${activeTenant.namespace}`);

      res.status(201).json(activeTenant);
    } catch (error) {
      logger.error('Error creating tenant:', error);
      res.status(500).json({ error: 'Failed to create tenant' });
    }
  }

  static async getTenant(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const tenant = await TenantModel.findById(id);

      if (!tenant) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }

      res.json(tenant);
    } catch (error) {
      logger.error('Error fetching tenant:', error);
      res.status(500).json({ error: 'Failed to fetch tenant' });
    }
  }

  static async listTenants(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { status, tier } = req.query;

      const filters: any = {};
      if (status) filters.status = status;
      if (tier) filters.tier = tier;

      const tenants = await TenantModel.findAll(filters);

      res.json({ tenants, total: tenants.length });
    } catch (error) {
      logger.error('Error listing tenants:', error);
      res.status(500).json({ error: 'Failed to list tenants' });
    }
  }

  static async updateTenant(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const tenant = await TenantModel.update(id, updates);

      logger.info(`Tenant updated: ${id}`);

      res.json(tenant);
    } catch (error) {
      logger.error('Error updating tenant:', error);
      res.status(500).json({ error: 'Failed to update tenant' });
    }
  }

  static async deleteTenant(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const tenant = await TenantModel.findById(id);

      if (!tenant) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }

      // Deprovision Kubernetes resources
      await TenantService.deprovisionNamespace(tenant.namespace);

      await TenantModel.delete(id);

      logger.info(`Tenant deleted: ${id}`);

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting tenant:', error);
      res.status(500).json({ error: 'Failed to delete tenant' });
    }
  }

  static async getTenantMetrics(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const metrics = await TenantModel.getMetrics(id);

      if (!metrics) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }

      // Get Kubernetes resource usage
      const k8sMetrics = await TenantService.getNamespaceMetrics(metrics.tenant.namespace);

      res.json({
        ...metrics,
        kubernetes: k8sMetrics
      });
    } catch (error) {
      logger.error('Error fetching tenant metrics:', error);
      res.status(500).json({ error: 'Failed to fetch tenant metrics' });
    }
  }
}
