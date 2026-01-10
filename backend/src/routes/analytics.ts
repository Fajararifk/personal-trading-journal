import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types';
import { calculateMetrics, detectBehaviorWarnings, getDateRanges } from '../utils/calculations';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Get PnL summary
router.get('/pnl', async (req: AuthRequest, res: Response) => {
  try {
    const ranges = getDateRanges();
    
    const [dailyTrades, weeklyTrades, monthlyTrades, yearlyTrades, allTrades] = await Promise.all([
      prisma.trade.findMany({
        where: {
          userId: req.userId,
          isOpen: false,
          closedAt: { gte: ranges.today.start, lte: ranges.today.end },
        },
      }),
      prisma.trade.findMany({
        where: {
          userId: req.userId,
          isOpen: false,
          closedAt: { gte: ranges.week.start, lte: ranges.week.end },
        },
      }),
      prisma.trade.findMany({
        where: {
          userId: req.userId,
          isOpen: false,
          closedAt: { gte: ranges.month.start, lte: ranges.month.end },
        },
      }),
      prisma.trade.findMany({
        where: {
          userId: req.userId,
          isOpen: false,
          closedAt: { gte: ranges.year.start, lte: ranges.year.end },
        },
      }),
      prisma.trade.findMany({
        where: { userId: req.userId, isOpen: false },
      }),
    ]);
    
    const sumPnL = (trades: any[]) => trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    
    res.json({
      daily: Math.round(sumPnL(dailyTrades) * 100) / 100,
      weekly: Math.round(sumPnL(weeklyTrades) * 100) / 100,
      monthly: Math.round(sumPnL(monthlyTrades) * 100) / 100,
      yearly: Math.round(sumPnL(yearlyTrades) * 100) / 100,
      total: Math.round(sumPnL(allTrades) * 100) / 100,
    });
  } catch (error) {
    console.error('Get PnL error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get performance metrics
router.get('/metrics', async (req: AuthRequest, res: Response) => {
  try {
    const { period } = req.query;
    const ranges = getDateRanges();
    
    let dateFilter: any = {};
    if (period === 'daily') {
      dateFilter = { gte: ranges.today.start, lte: ranges.today.end };
    } else if (period === 'weekly') {
      dateFilter = { gte: ranges.week.start, lte: ranges.week.end };
    } else if (period === 'monthly') {
      dateFilter = { gte: ranges.month.start, lte: ranges.month.end };
    } else if (period === 'yearly') {
      dateFilter = { gte: ranges.year.start, lte: ranges.year.end };
    }
    
    const trades = await prisma.trade.findMany({
      where: {
        userId: req.userId,
        isOpen: false,
        ...(Object.keys(dateFilter).length > 0 && { closedAt: dateFilter }),
      },
      orderBy: { closedAt: 'asc' },
    });
    
    const metrics = calculateMetrics(trades);
    res.json(metrics);
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get equity curve data
router.get('/equity-curve', async (req: AuthRequest, res: Response) => {
  try {
    const trades = await prisma.trade.findMany({
      where: { userId: req.userId, isOpen: false },
      orderBy: { closedAt: 'asc' },
      select: { closedAt: true, pnl: true },
    });
    
    let cumulative = 0;
    const curve = trades.map(t => {
      cumulative += t.pnl ?? 0;
      return {
        date: t.closedAt?.toISOString().split('T')[0],
        equity: Math.round(cumulative * 100) / 100,
        pnl: Math.round((t.pnl ?? 0) * 100) / 100,
      };
    });
    
    // Aggregate by date
    const aggregated = curve.reduce((acc, point) => {
      const existing = acc.find(p => p.date === point.date);
      if (existing) {
        existing.equity = point.equity;
        existing.pnl += point.pnl;
      } else {
        acc.push({ ...point });
      }
      return acc;
    }, [] as typeof curve);
    
    res.json(aggregated);
  } catch (error) {
    console.error('Get equity curve error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get profit by period (for charts)
router.get('/profit-by-period', async (req: AuthRequest, res: Response) => {
  try {
    const { period = 'daily' } = req.query;
    
    const trades = await prisma.trade.findMany({
      where: { userId: req.userId, isOpen: false },
      orderBy: { closedAt: 'asc' },
    });
    
    const grouped = new Map<string, number>();
    
    for (const trade of trades) {
      if (!trade.closedAt) continue;
      
      let key: string;
      const date = new Date(trade.closedAt);
      
      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const weekStart = new Date(date);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
        weekStart.setDate(diff);
        key = weekStart.toISOString().split('T')[0];
      } else if (period === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = String(date.getFullYear());
      }
      
      grouped.set(key, (grouped.get(key) ?? 0) + (trade.pnl ?? 0));
    }
    
    const result = Array.from(grouped.entries()).map(([period, profit]) => ({
      period,
      profit: Math.round(profit * 100) / 100,
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Get profit by period error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get behavior warnings
router.get('/behavior', async (req: AuthRequest, res: Response) => {
  try {
    const trades = await prisma.trade.findMany({
      where: { userId: req.userId },
      orderBy: { openedAt: 'desc' },
      take: 100,
    });
    
    const warnings = detectBehaviorWarnings(trades);
    res.json(warnings);
  } catch (error) {
    console.error('Get behavior error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trade distribution by asset
router.get('/distribution', async (req: AuthRequest, res: Response) => {
  try {
    const trades = await prisma.trade.findMany({
      where: { userId: req.userId, isOpen: false },
    });
    
    // By asset
    const byAsset = new Map<string, { count: number; pnl: number }>();
    for (const trade of trades) {
      const existing = byAsset.get(trade.asset) ?? { count: 0, pnl: 0 };
      existing.count++;
      existing.pnl += trade.pnl ?? 0;
      byAsset.set(trade.asset, existing);
    }
    
    // By market
    const byMarket = { STOCK: { count: 0, pnl: 0 }, CRYPTO: { count: 0, pnl: 0 } };
    for (const trade of trades) {
      byMarket[trade.market].count++;
      byMarket[trade.market].pnl += trade.pnl ?? 0;
    }
    
    // By position
    const byPosition = { LONG: { count: 0, pnl: 0 }, SHORT: { count: 0, pnl: 0 } };
    for (const trade of trades) {
      byPosition[trade.position].count++;
      byPosition[trade.position].pnl += trade.pnl ?? 0;
    }
    
    res.json({
      byAsset: Array.from(byAsset.entries()).map(([asset, data]) => ({
        asset,
        count: data.count,
        pnl: Math.round(data.pnl * 100) / 100,
      })),
      byMarket: Object.entries(byMarket).map(([market, data]) => ({
        market,
        count: data.count,
        pnl: Math.round(data.pnl * 100) / 100,
      })),
      byPosition: Object.entries(byPosition).map(([position, data]) => ({
        position,
        count: data.count,
        pnl: Math.round(data.pnl * 100) / 100,
      })),
    });
  } catch (error) {
    console.error('Get distribution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
