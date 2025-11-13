import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

const router = Router();

// Mock user database (in production, use proper database)
const users: any[] = [];

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, tenantId, role = 'tenant-user' } = req.body;

    if (!email || !password || !tenantId) {
      res.status(400).json({ error: 'Email, password, and tenantId are required' });
      return;
    }

    // Check if user exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      res.status(409).json({ error: 'User already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      id: `user-${Date.now()}`,
      email,
      password: hashedPassword,
      tenantId,
      role
    };

    users.push(user);

    logger.info(`User registered: ${email} for tenant: ${tenantId}`);

    res.status(201).json({
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role
    });
  } catch (error) {
    logger.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate JWT
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email
      },
      secret,
      { expiresIn: '24h' }
    );

    logger.info(`User logged in: ${email}`);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Error logging in user:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

export default router;
