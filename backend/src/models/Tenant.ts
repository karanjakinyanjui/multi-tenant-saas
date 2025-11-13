import { db } from '../config/database';

export interface Tenant {
  id: string;
  name: string;
  namespace: string;
  email: string;
  status: 'active' | 'suspended' | 'pending';
  tier: 'basic' | 'pro' | 'enterprise';
  quotas: {
    cpu: string;
    memory: string;
    storage: string;
    maxParticipants: number;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
  };
  settings: Record<string, any>;
}

export class TenantModel {
  static async create(tenant: Omit<Tenant, 'id' | 'metadata'>): Promise<Tenant> {
    const [created] = await db('tenants')
      .insert({
        ...tenant,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    return this.mapToTenant(created);
  }

  static async findById(id: string): Promise<Tenant | null> {
    const tenant = await db('tenants').where({ id }).first();
    return tenant ? this.mapToTenant(tenant) : null;
  }

  static async findByNamespace(namespace: string): Promise<Tenant | null> {
    const tenant = await db('tenants').where({ namespace }).first();
    return tenant ? this.mapToTenant(tenant) : null;
  }

  static async findAll(filters?: any): Promise<Tenant[]> {
    let query = db('tenants');

    if (filters?.status) {
      query = query.where('status', filters.status);
    }

    if (filters?.tier) {
      query = query.where('tier', filters.tier);
    }

    const tenants = await query.select('*');
    return tenants.map(this.mapToTenant);
  }

  static async update(id: string, updates: Partial<Tenant>): Promise<Tenant> {
    const [updated] = await db('tenants')
      .where({ id })
      .update({
        ...updates,
        updated_at: new Date()
      })
      .returning('*');

    return this.mapToTenant(updated);
  }

  static async delete(id: string): Promise<void> {
    await db('tenants').where({ id }).delete();
  }

  static async getMetrics(id: string): Promise<any> {
    const tenant = await this.findById(id);
    if (!tenant) return null;

    const participantCount = await db('participants')
      .where({ tenant_id: id })
      .count('* as count')
      .first();

    const funnelStats = await db('funnel_progress')
      .select('stage')
      .count('* as count')
      .where({ tenant_id: id })
      .groupBy('stage');

    return {
      tenant,
      metrics: {
        totalParticipants: participantCount?.count || 0,
        funnelDistribution: funnelStats,
        quotaUsage: await this.getQuotaUsage(id)
      }
    };
  }

  static async getQuotaUsage(id: string): Promise<any> {
    // This would integrate with Kubernetes API to get actual resource usage
    return {
      cpu: { used: '0.5', limit: '2' },
      memory: { used: '512Mi', limit: '2Gi' },
      storage: { used: '1Gi', limit: '10Gi' }
    };
  }

  private static mapToTenant(row: any): Tenant {
    return {
      id: row.id,
      name: row.name,
      namespace: row.namespace,
      email: row.email,
      status: row.status,
      tier: row.tier,
      quotas: row.quotas,
      metadata: {
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by
      },
      settings: row.settings || {}
    };
  }
}
