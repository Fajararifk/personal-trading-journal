import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient, Market, Position, EmotionTag } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types';
import { calculatePnL, getDateRanges } from '../utils/calculations';

const router = Router();
const prisma = new PrismaClient();

const tradeSchema = z.object({
  asset: z.string().min(1),
  market: z.enum(['STOCK', 'CRYPTO']),
  position: z.enum(['BELI', 'JUAL']),
  entryPrice: z.number().positive(),
  exitPrice: z.number().positive().optional(),
  quantity: z.number().positive(),
  fees: z.number().min(0).default(0),
  openedAt: z.string().datetime(),
  closedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  emotionTag: z.enum(['CONFIDENT', 'FEARFUL', 'GREEDY', 'NEUTRAL', 'FRUSTRATED', 'EXCITED', 'ANXIOUS', 'CALM']).optional(),
});

// Apply auth to all routes
router.use(authMiddleware);

// Get all trades
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { market, isOpen, from, to, limit = '50', offset = '0' } = req.query;
    
    const where: any = { userId: req.userId };
    
    if (market) where.market = market as Market;
    if (isOpen !== undefined) where.isOpen = isOpen === 'true';
    if (from || to) {
      where.openedAt = {};
      if (from) where.openedAt.gte = new Date(from as string);
      if (to) where.openedAt.lte = new Date(to as string);
    }
    
    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.trade.count({ where }),
    ]);
    
    res.json({ trades, total });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single trade
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const trade = await prisma.trade.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!trade) {
      res.status(404).json({ error: 'Trade not found' });
      return;
    }
    
    res.json(trade);
  } catch (error) {
    console.error('Get trade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create trade
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = tradeSchema.parse(req.body);
    
    let pnl: number | null = null;
    let pnlPercent: number | null = null;
    let isOpen = true;
    
    if (data.exitPrice && data.closedAt) {
      const result = calculatePnL(
        data.position,
        data.entryPrice,
        data.exitPrice,
        data.quantity,
        data.fees
      );
      pnl = result.pnl;
      pnlPercent = result.pnlPercent;
      isOpen = false;
    }
    
    const trade = await prisma.trade.create({
      data: {
        userId: req.userId!,
        asset: data.asset.toUpperCase(),
        market: data.market as Market,
        position: data.position as Position,
        entryPrice: data.entryPrice,
        exitPrice: data.exitPrice,
        quantity: data.quantity,
        fees: data.fees,
        openedAt: new Date(data.openedAt),
        closedAt: data.closedAt ? new Date(data.closedAt) : null,
        notes: data.notes,
        emotionTag: data.emotionTag as EmotionTag | undefined,
        pnl,
        pnlPercent,
        isOpen,
      },
    });
    
    res.status(201).json(trade);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Create trade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update trade
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existingTrade = await prisma.trade.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!existingTrade) {
      res.status(404).json({ error: 'Trade not found' });
      return;
    }
    
    const data = tradeSchema.partial().parse(req.body);
    
    let pnl = existingTrade.pnl;
    let pnlPercent = existingTrade.pnlPercent;
    let isOpen = existingTrade.isOpen;
    
    const entryPrice = data.entryPrice ?? existingTrade.entryPrice;
    const exitPrice = data.exitPrice ?? existingTrade.exitPrice;
    const quantity = data.quantity ?? existingTrade.quantity;
    const fees = data.fees ?? existingTrade.fees;
    const position = (data.position ?? existingTrade.position) as 'LONG' | 'SHORT';
    const closedAt = data.closedAt ? new Date(data.closedAt) : existingTrade.closedAt;
    
    if (exitPrice && closedAt) {
      const result = calculatePnL(position, entryPrice, exitPrice, quantity, fees);
      pnl = result.pnl;
      pnlPercent = result.pnlPercent;
      isOpen = false;
    }
    
    const trade = await prisma.trade.update({
      where: { id: req.params.id },
      data: {
        ...data,
        openedAt: data.openedAt ? new Date(data.openedAt) : undefined,
        closedAt: data.closedAt ? new Date(data.closedAt) : undefined,
        emotionTag: data.emotionTag as EmotionTag | undefined,
        pnl,
        pnlPercent,
        isOpen,
      },
    });
    
    res.json(trade);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Update trade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Close trade
router.post('/:id/close', async (req: AuthRequest, res: Response) => {
  try {
    const { exitPrice, closedAt, fees } = z.object({
      exitPrice: z.number().positive(),
      closedAt: z.string().datetime().optional(),
      fees: z.number().min(0).optional(),
    }).parse(req.body);
    
    const existingTrade = await prisma.trade.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!existingTrade) {
      res.status(404).json({ error: 'Trade not found' });
      return;
    }
    
    if (!existingTrade.isOpen) {
      res.status(400).json({ error: 'Trade is already closed' });
      return;
    }
    
    const totalFees = existingTrade.fees + (fees ?? 0);
    const result = calculatePnL(
      existingTrade.position as 'LONG' | 'SHORT',
      existingTrade.entryPrice,
      exitPrice,
      existingTrade.quantity,
      totalFees
    );
    
    const trade = await prisma.trade.update({
      where: { id: req.params.id },
      data: {
        exitPrice,
        closedAt: closedAt ? new Date(closedAt) : new Date(),
        fees: totalFees,
        pnl: result.pnl,
        pnlPercent: result.pnlPercent,
        isOpen: false,
      },
    });
    
    res.json(trade);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Close trade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete trade
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existingTrade = await prisma.trade.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!existingTrade) {
      res.status(404).json({ error: 'Trade not found' });
      return;
    }
    
    await prisma.trade.delete({ where: { id: req.params.id } });
    
    res.json({ message: 'Trade deleted' });
  } catch (error) {
    console.error('Delete trade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
