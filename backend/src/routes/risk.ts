import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// Apply auth to all routes
router.use(authMiddleware);

// Get user risk settings
router.get('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        accountBalance: true,
        riskPerTrade: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get risk settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user risk settings
router.put('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const schema = z.object({
      accountBalance: z.number().min(0).optional(),
      riskPerTrade: z.number().min(0).max(100).optional(),
    });

    const data = schema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        accountBalance: true,
        riskPerTrade: true,
      },
    });

    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Update risk settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate position size
router.post('/calculate/position-size', async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      accountBalance: z.number().positive(),
      riskPercent: z.number().positive().max(100),
      entryPrice: z.number().positive(),
      stopLoss: z.number().positive(),
    });

    const { accountBalance, riskPercent, entryPrice, stopLoss } = schema.parse(req.body);

    // Calculate risk amount in currency
    const riskAmount = accountBalance * (riskPercent / 100);

    // Calculate risk per share/unit
    const riskPerUnit = Math.abs(entryPrice - stopLoss);

    if (riskPerUnit === 0) {
      res.status(400).json({ error: 'Stop loss cannot be equal to entry price' });
      return;
    }

    // Calculate position size (number of shares/units)
    const positionSize = riskAmount / riskPerUnit;

    // Calculate total position value
    const totalValue = positionSize * entryPrice;

    // Calculate percentage of portfolio
    const portfolioPercent = (totalValue / accountBalance) * 100;

    res.json({
      positionSize: Math.floor(positionSize * 100) / 100, // Round to 2 decimals
      totalValue: Math.floor(totalValue * 100) / 100,
      riskAmount: Math.floor(riskAmount * 100) / 100,
      riskPerUnit: Math.floor(riskPerUnit * 100) / 100,
      portfolioPercent: Math.floor(portfolioPercent * 100) / 100,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Calculate position size error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate stop loss
router.post('/calculate/stop-loss', async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      entryPrice: z.number().positive(),
      riskPercent: z.number().positive().max(100),
      position: z.enum(['BELI', 'JUAL']),
    });

    const { entryPrice, riskPercent, position } = schema.parse(req.body);

    // Calculate stop loss based on risk percentage
    let stopLoss: number;
    if (position === 'BELI') {
      stopLoss = entryPrice * (1 - riskPercent / 100);
    } else {
      stopLoss = entryPrice * (1 + riskPercent / 100);
    }

    // Calculate distance
    const distance = Math.abs(entryPrice - stopLoss);
    const distancePercent = (distance / entryPrice) * 100;

    res.json({
      stopLoss: Math.floor(stopLoss * 100) / 100,
      distance: Math.floor(distance * 100) / 100,
      distancePercent: Math.floor(distancePercent * 100) / 100,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Calculate stop loss error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate risk/reward ratio
router.post('/calculate/risk-reward', async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      entryPrice: z.number().positive(),
      stopLoss: z.number().positive(),
      targetPrice: z.number().positive(),
      position: z.enum(['BELI', 'JUAL']),
    });

    const { entryPrice, stopLoss, targetPrice, position } = schema.parse(req.body);

    let risk: number;
    let reward: number;

    if (position === 'BELI') {
      risk = entryPrice - stopLoss;
      reward = targetPrice - entryPrice;
    } else {
      risk = stopLoss - entryPrice;
      reward = entryPrice - targetPrice;
    }

    if (risk <= 0) {
      res.status(400).json({ error: 'Invalid stop loss for the given position' });
      return;
    }

    if (reward <= 0) {
      res.status(400).json({ error: 'Invalid target price for the given position' });
      return;
    }

    const riskRewardRatio = reward / risk;
    const riskPercent = (risk / entryPrice) * 100;
    const rewardPercent = (reward / entryPrice) * 100;

    res.json({
      risk: Math.floor(risk * 100) / 100,
      reward: Math.floor(reward * 100) / 100,
      riskRewardRatio: Math.floor(riskRewardRatio * 100) / 100,
      riskPercent: Math.floor(riskPercent * 100) / 100,
      rewardPercent: Math.floor(rewardPercent * 100) / 100,
      isGoodTrade: riskRewardRatio >= 2, // Generally, R:R >= 2:1 is considered good
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Calculate risk-reward error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
