import { db } from '../config/database';

export type FunnelStage = 'mobilization' | 'acquisition' | 'verification' | 'retention' | 'graduation' | 'followup';

export interface Participant {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  currentStage: FunnelStage;
  status: 'active' | 'inactive' | 'graduated' | 'dropped';
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    enrolledAt: Date;
  };
  skills: string[];
  notes?: string;
}

export interface FunnelProgress {
  id: string;
  participantId: string;
  tenantId: string;
  stage: FunnelStage;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  data: Record<string, any>;
  notes?: string;
}

export class ParticipantModel {
  static async create(participant: Omit<Participant, 'id' | 'metadata'>): Promise<Participant> {
    const [created] = await db('participants')
      .insert({
        tenant_id: participant.tenantId,
        first_name: participant.firstName,
        last_name: participant.lastName,
        email: participant.email,
        phone: participant.phone,
        date_of_birth: participant.dateOfBirth,
        current_stage: participant.currentStage,
        status: participant.status,
        skills: JSON.stringify(participant.skills),
        notes: participant.notes,
        created_at: new Date(),
        updated_at: new Date(),
        enrolled_at: new Date()
      })
      .returning('*');

    return this.mapToParticipant(created);
  }

  static async findById(id: string, tenantId: string): Promise<Participant | null> {
    const participant = await db('participants')
      .where({ id, tenant_id: tenantId })
      .first();

    return participant ? this.mapToParticipant(participant) : null;
  }

  static async findAll(tenantId: string, filters?: any): Promise<Participant[]> {
    let query = db('participants').where({ tenant_id: tenantId });

    if (filters?.stage) {
      query = query.where('current_stage', filters.stage);
    }

    if (filters?.status) {
      query = query.where('status', filters.status);
    }

    const participants = await query.select('*').orderBy('created_at', 'desc');
    return participants.map(this.mapToParticipant);
  }

  static async update(id: string, tenantId: string, updates: Partial<Participant>): Promise<Participant> {
    const updateData: any = {
      updated_at: new Date()
    };

    if (updates.firstName) updateData.first_name = updates.firstName;
    if (updates.lastName) updateData.last_name = updates.lastName;
    if (updates.email) updateData.email = updates.email;
    if (updates.phone) updateData.phone = updates.phone;
    if (updates.currentStage) updateData.current_stage = updates.currentStage;
    if (updates.status) updateData.status = updates.status;
    if (updates.skills) updateData.skills = JSON.stringify(updates.skills);
    if (updates.notes) updateData.notes = updates.notes;

    const [updated] = await db('participants')
      .where({ id, tenant_id: tenantId })
      .update(updateData)
      .returning('*');

    return this.mapToParticipant(updated);
  }

  static async delete(id: string, tenantId: string): Promise<void> {
    await db('participants')
      .where({ id, tenant_id: tenantId })
      .delete();
  }

  static async getStatsByStage(tenantId: string): Promise<any> {
    const stats = await db('participants')
      .select('current_stage as stage')
      .count('* as count')
      .where({ tenant_id: tenantId })
      .groupBy('current_stage');

    return stats.reduce((acc, stat) => {
      acc[stat.stage] = parseInt(stat.count);
      return acc;
    }, {} as Record<string, number>);
  }

  private static mapToParticipant(row: any): Participant {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      dateOfBirth: row.date_of_birth,
      currentStage: row.current_stage,
      status: row.status,
      metadata: {
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        enrolledAt: row.enrolled_at
      },
      skills: row.skills ? JSON.parse(row.skills) : [],
      notes: row.notes
    };
  }
}

export class FunnelProgressModel {
  static async create(progress: Omit<FunnelProgress, 'id'>): Promise<FunnelProgress> {
    const [created] = await db('funnel_progress')
      .insert({
        participant_id: progress.participantId,
        tenant_id: progress.tenantId,
        stage: progress.stage,
        status: progress.status,
        started_at: progress.startedAt || new Date(),
        completed_at: progress.completedAt,
        data: JSON.stringify(progress.data),
        notes: progress.notes
      })
      .returning('*');

    return this.mapToFunnelProgress(created);
  }

  static async findByParticipant(participantId: string, tenantId: string): Promise<FunnelProgress[]> {
    const progress = await db('funnel_progress')
      .where({ participant_id: participantId, tenant_id: tenantId })
      .orderBy('started_at', 'asc');

    return progress.map(this.mapToFunnelProgress);
  }

  static async update(id: string, updates: Partial<FunnelProgress>): Promise<FunnelProgress> {
    const updateData: any = {};

    if (updates.status) updateData.status = updates.status;
    if (updates.completedAt) updateData.completed_at = updates.completedAt;
    if (updates.data) updateData.data = JSON.stringify(updates.data);
    if (updates.notes) updateData.notes = updates.notes;

    const [updated] = await db('funnel_progress')
      .where({ id })
      .update(updateData)
      .returning('*');

    return this.mapToFunnelProgress(updated);
  }

  static async getFunnelMetrics(tenantId: string): Promise<any> {
    const stages: FunnelStage[] = [
      'mobilization',
      'acquisition',
      'verification',
      'retention',
      'graduation',
      'followup'
    ];

    const metrics: any = {};

    for (const stage of stages) {
      const total = await db('funnel_progress')
        .where({ tenant_id: tenantId, stage })
        .count('* as count')
        .first();

      const completed = await db('funnel_progress')
        .where({ tenant_id: tenantId, stage, status: 'completed' })
        .count('* as count')
        .first();

      const avgTime = await db('funnel_progress')
        .where({ tenant_id: tenantId, stage, status: 'completed' })
        .whereNotNull('completed_at')
        .select(
          db.raw('AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration')
        )
        .first();

      metrics[stage] = {
        total: parseInt(total?.count || '0'),
        completed: parseInt(completed?.count || '0'),
        avgDurationSeconds: avgTime?.avg_duration || 0
      };
    }

    return metrics;
  }

  private static mapToFunnelProgress(row: any): FunnelProgress {
    return {
      id: row.id,
      participantId: row.participant_id,
      tenantId: row.tenant_id,
      stage: row.stage,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      data: row.data ? JSON.parse(row.data) : {},
      notes: row.notes
    };
  }
}
