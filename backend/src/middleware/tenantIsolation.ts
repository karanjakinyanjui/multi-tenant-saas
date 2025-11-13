import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

export interface TenantRequest extends Request {
  tenantId?: string;
  userId?: string;
  userRole?: string;
}

export const extractTenantFromToken = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'your-secret-key';

    const decoded = jwt.verify(token, secret) as any;

    req.tenantId = decoded.tenantId;
    req.userId = decoded.userId;
    req.userRole = decoded.role;

    logger.info(`Request from tenant: ${req.tenantId}, user: ${req.userId}`);

    next();
  } catch (error) {
    logger.error('Token validation failed:', error);
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.userRole
      });
    }

    next();
  };
};

export const validateTenantAccess = (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  const requestedTenantId = req.params.tenantId || req.body.tenantId;

  // Super admins can access all tenants
  if (req.userRole === 'super-admin') {
    next();
    return;
  }

  // Regular users can only access their own tenant
  if (requestedTenantId && requestedTenantId !== req.tenantId) {
    logger.warn(
      `Unauthorized tenant access attempt: user ${req.userId} tried to access tenant ${requestedTenantId}`
    );
    return res.status(403).json({ error: 'Access to this tenant is not allowed' });
  }

  next();
};
