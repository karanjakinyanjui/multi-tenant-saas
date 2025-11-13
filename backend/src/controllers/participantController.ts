import { Response } from 'express';
import { TenantRequest } from '../middleware/tenantIsolation';
import { ParticipantModel, FunnelProgressModel, FunnelStage } from '../models/Participant';
import { logger } from '../utils/logger';

export class ParticipantController {
  static async createParticipant(req: TenantRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { firstName, lastName, email, phone, dateOfBirth, skills = [] } = req.body;

      if (!firstName || !lastName || !email) {
        res.status(400).json({ error: 'First name, last name, and email are required' });
        return;
      }

      // Create participant starting at mobilization stage
      const participant = await ParticipantModel.create({
        tenantId,
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        currentStage: 'mobilization',
        status: 'active',
        skills
      });

      // Initialize funnel progress
      await FunnelProgressModel.create({
        participantId: participant.id,
        tenantId,
        stage: 'mobilization',
        status: 'in_progress',
        startedAt: new Date(),
        data: {}
      });

      logger.info(`Participant created: ${participant.id} for tenant: ${tenantId}`);

      res.status(201).json(participant);
    } catch (error) {
      logger.error('Error creating participant:', error);
      res.status(500).json({ error: 'Failed to create participant' });
    }
  }

  static async getParticipant(req: TenantRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;

      const participant = await ParticipantModel.findById(id, tenantId);

      if (!participant) {
        res.status(404).json({ error: 'Participant not found' });
        return;
      }

      res.json(participant);
    } catch (error) {
      logger.error('Error fetching participant:', error);
      res.status(500).json({ error: 'Failed to fetch participant' });
    }
  }

  static async listParticipants(req: TenantRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { stage, status } = req.query;

      const filters: any = {};
      if (stage) filters.stage = stage;
      if (status) filters.status = status;

      const participants = await ParticipantModel.findAll(tenantId, filters);

      res.json({ participants, total: participants.length });
    } catch (error) {
      logger.error('Error listing participants:', error);
      res.status(500).json({ error: 'Failed to list participants' });
    }
  }

  static async updateParticipant(req: TenantRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const updates = req.body;

      const participant = await ParticipantModel.update(id, tenantId, updates);

      logger.info(`Participant updated: ${id}`);

      res.json(participant);
    } catch (error) {
      logger.error('Error updating participant:', error);
      res.status(500).json({ error: 'Failed to update participant' });
    }
  }

  static async deleteParticipant(req: TenantRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;

      await ParticipantModel.delete(id, tenantId);

      logger.info(`Participant deleted: ${id}`);

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting participant:', error);
      res.status(500).json({ error: 'Failed to delete participant' });
    }
  }

  static async getParticipantFunnel(req: TenantRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;

      const participant = await ParticipantModel.findById(id, tenantId);

      if (!participant) {
        res.status(404).json({ error: 'Participant not found' });
        return;
      }

      const funnelProgress = await FunnelProgressModel.findByParticipant(id, tenantId);

      res.json({
        participant,
        funnelProgress,
        currentStage: participant.currentStage
      });
    } catch (error) {
      logger.error('Error fetching participant funnel:', error);
      res.status(500).json({ error: 'Failed to fetch participant funnel' });
    }
  }

  static async advanceStage(req: TenantRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { nextStage, data = {} } = req.body;

      const participant = await ParticipantModel.findById(id, tenantId);

      if (!participant) {
        res.status(404).json({ error: 'Participant not found' });
        return;
      }

      const validStages: FunnelStage[] = [
        'mobilization',
        'acquisition',
        'verification',
        'retention',
        'graduation',
        'followup'
      ];

      if (!validStages.includes(nextStage)) {
        res.status(400).json({ error: 'Invalid stage' });
        return;
      }

      // Complete current stage
      const currentProgress = await FunnelProgressModel.findByParticipant(id, tenantId);
      const currentStageProgress = currentProgress.find(
        p => p.stage === participant.currentStage && p.status === 'in_progress'
      );

      if (currentStageProgress) {
        await FunnelProgressModel.update(currentStageProgress.id, {
          status: 'completed',
          completedAt: new Date(),
          data: { ...currentStageProgress.data, ...data }
        });
      }

      // Start next stage
      await FunnelProgressModel.create({
        participantId: id,
        tenantId,
        stage: nextStage,
        status: 'in_progress',
        startedAt: new Date(),
        data
      });

      // Update participant
      const updatedParticipant = await ParticipantModel.update(id, tenantId, {
        currentStage: nextStage
      });

      logger.info(`Participant ${id} advanced to stage: ${nextStage}`);

      res.json(updatedParticipant);
    } catch (error) {
      logger.error('Error advancing participant stage:', error);
      res.status(500).json({ error: 'Failed to advance stage' });
    }
  }

  static async getStageStatistics(req: TenantRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const stats = await ParticipantModel.getStatsByStage(tenantId);
      const funnelMetrics = await FunnelProgressModel.getFunnelMetrics(tenantId);

      res.json({
        currentDistribution: stats,
        stageMetrics: funnelMetrics
      });
    } catch (error) {
      logger.error('Error fetching stage statistics:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
}
