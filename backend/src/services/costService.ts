import * as k8s from '@kubernetes/client-node';
import { TenantModel } from '../models/Tenant';
import { logger } from '../utils/logger';

interface ResourceCost {
  cpu: number;
  memory: number;
  storage: number;
  total: number;
}

export class CostService {
  private static k8sApi: k8s.CoreV1Api;
  private static metricsApi: k8s.Metrics;

  // Cost per unit (simplified pricing)
  private static readonly COSTS = {
    cpuPerCore: 0.05, // $ per core-hour
    memoryPerGb: 0.01, // $ per GB-hour
    storagePerGb: 0.1 // $ per GB-month
  };

  static initialize(): void {
    const kc = new k8s.KubeConfig();

    try {
      kc.loadFromCluster();
    } catch {
      kc.loadFromDefault();
    }

    this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    this.metricsApi = new k8s.Metrics(kc);
  }

  static async generateCostReport(
    tenantId: string,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    try {
      const tenant = await TenantModel.findById(tenantId);

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      logger.info(`Generating cost report for tenant: ${tenantId}`);

      // Get resource usage
      const usage = await this.getNamespaceResourceUsage(tenant.namespace);

      // Calculate costs
      const costs = this.calculateCosts(usage);

      // Get historical data (simplified - in production, store metrics over time)
      const period = {
        start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: endDate || new Date().toISOString()
      };

      return {
        tenantId,
        tenantName: tenant.name,
        namespace: tenant.namespace,
        period,
        usage,
        costs,
        tier: tenant.tier,
        quotas: tenant.quotas
      };
    } catch (error) {
      logger.error(`Error generating cost report for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  static async getAllTenantsCostSummary(): Promise<any> {
    try {
      const tenants = await TenantModel.findAll({ status: 'active' });

      const summary = await Promise.all(
        tenants.map(async tenant => {
          try {
            const usage = await this.getNamespaceResourceUsage(tenant.namespace);
            const costs = this.calculateCosts(usage);

            return {
              tenantId: tenant.id,
              tenantName: tenant.name,
              namespace: tenant.namespace,
              tier: tenant.tier,
              costs
            };
          } catch (error) {
            logger.error(`Error getting costs for tenant ${tenant.id}:`, error);
            return {
              tenantId: tenant.id,
              tenantName: tenant.name,
              namespace: tenant.namespace,
              tier: tenant.tier,
              costs: { total: 0, error: 'Unable to fetch costs' }
            };
          }
        })
      );

      const totalCost = summary.reduce((sum, item) => sum + (item.costs.total || 0), 0);

      return {
        summary,
        totalCost,
        totalTenants: tenants.length,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error generating cost summary:', error);
      throw error;
    }
  }

  private static async getNamespaceResourceUsage(namespace: string): Promise<any> {
    try {
      // Get pods in namespace
      const pods = await this.k8sApi.listNamespacedPod(namespace);

      // Get PVCs in namespace
      const pvcs = await this.k8sApi.listNamespacedPersistentVolumeClaim(namespace);

      let totalCpu = 0;
      let totalMemory = 0;

      // Sum up resource requests
      for (const pod of pods.body.items) {
        if (pod.spec?.containers) {
          for (const container of pod.spec.containers) {
            if (container.resources?.requests) {
              // Parse CPU (can be in cores or millicores)
              const cpuRequest = container.resources.requests.cpu || '0';
              totalCpu += this.parseCpu(cpuRequest);

              // Parse memory (can be in various units)
              const memoryRequest = container.resources.requests.memory || '0';
              totalMemory += this.parseMemory(memoryRequest);
            }
          }
        }
      }

      // Sum up storage
      let totalStorage = 0;
      for (const pvc of pvcs.body.items) {
        if (pvc.spec?.resources?.requests?.storage) {
          totalStorage += this.parseMemory(pvc.spec.resources.requests.storage);
        }
      }

      return {
        cpu: totalCpu.toFixed(2) + ' cores',
        memory: (totalMemory / 1024).toFixed(2) + ' Gi',
        storage: (totalStorage / 1024).toFixed(2) + ' Gi',
        pods: pods.body.items.length,
        pvcs: pvcs.body.items.length
      };
    } catch (error) {
      logger.error(`Error getting resource usage for namespace ${namespace}:`, error);
      throw error;
    }
  }

  private static calculateCosts(usage: any): ResourceCost {
    // Parse values
    const cpu = parseFloat(usage.cpu);
    const memory = parseFloat(usage.memory);
    const storage = parseFloat(usage.storage);

    // Calculate hourly costs
    const cpuCost = cpu * this.COSTS.cpuPerCore * 24 * 30; // Monthly cost
    const memoryCost = memory * this.COSTS.memoryPerGb * 24 * 30; // Monthly cost
    const storageCost = storage * this.COSTS.storagePerGb; // Monthly cost

    const total = cpuCost + memoryCost + storageCost;

    return {
      cpu: parseFloat(cpuCost.toFixed(2)),
      memory: parseFloat(memoryCost.toFixed(2)),
      storage: parseFloat(storageCost.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    };
  }

  private static parseCpu(cpuString: string): number {
    if (cpuString.endsWith('m')) {
      return parseInt(cpuString) / 1000;
    }
    return parseFloat(cpuString);
  }

  private static parseMemory(memString: string): number {
    // Convert to GB
    if (memString.endsWith('Ki')) {
      return parseInt(memString) / (1024 * 1024);
    } else if (memString.endsWith('Mi')) {
      return parseInt(memString) / 1024;
    } else if (memString.endsWith('Gi')) {
      return parseInt(memString);
    } else if (memString.endsWith('Ti')) {
      return parseInt(memString) * 1024;
    }
    // Assume bytes
    return parseInt(memString) / (1024 * 1024 * 1024);
  }
}

// Initialize on module load
CostService.initialize();
