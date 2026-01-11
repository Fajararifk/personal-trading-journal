import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// Apply auth to all routes
router.use(authMiddleware);

// Get portfolio summary
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Get open trades (positions)
    const openTrades = await prisma.trade.findMany({
      where: { userId, isOpen: true },
      orderBy: { openedAt: 'desc' },
    });

    // Get closed trades for total P&L
    const closedTrades = await prisma.trade.findMany({
      where: { userId, isOpen: false },
    });

    // Get user account balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountBalance: true },
    });

    // Calculate total portfolio value
    const totalInvestedInOpenTrades = openTrades.reduce((sum, trade) => {
      return sum + (trade.entryPrice * trade.quantity);
    }, 0);

    // Calculate unrealized P&L (for demo purposes, using current price = entry price)
    // In production, you would fetch real-time prices from an API
    const unrealizedPnL = openTrades.reduce((sum, trade) => {
      // For now, we'll show 0 unrealized P&L since we don't have current prices
      // TODO: Integrate with price API
      return sum + 0;
    }, 0);

    // Calculate realized P&L from closed trades
    const realizedPnL = closedTrades.reduce((sum, trade) => {
      return sum + (trade.pnl || 0);
    }, 0);

    const accountBalance = user?.accountBalance || 0;
    const totalPortfolioValue = accountBalance + totalInvestedInOpenTrades + unrealizedPnL;

    res.json({
      totalValue: totalPortfolioValue,
      accountBalance,
      investedAmount: totalInvestedInOpenTrades,
      realizedPnL,
      unrealizedPnL,
      openPositions: openTrades.length,
      totalPositions: openTrades.length + closedTrades.length,
    });
  } catch (error) {
    console.error('Get portfolio summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get asset allocation (pie chart data)
router.get('/allocation', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Get open trades grouped by asset
    const openTrades = await prisma.trade.findMany({
      where: { userId, isOpen: true },
    });

    // Group by asset and calculate total value per asset
    const assetMap = new Map<string, { value: number; quantity: number }>();

    openTrades.forEach(trade => {
      const value = trade.entryPrice * trade.quantity;
      const existing = assetMap.get(trade.asset);

      if (existing) {
        assetMap.set(trade.asset, {
          value: existing.value + value,
          quantity: existing.quantity + trade.quantity,
        });
      } else {
        assetMap.set(trade.asset, { value, quantity: trade.quantity });
      }
    });

    // Convert to array format for pie chart
    const allocation = Array.from(assetMap.entries()).map(([asset, data]) => ({
      asset,
      value: data.value,
      quantity: data.quantity,
    }));

    // Sort by value descending
    allocation.sort((a, b) => b.value - a.value);

    res.json(allocation);
  } catch (error) {
    console.error('Get asset allocation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get portfolio performance by period
router.get('/performance', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const period = (req.query.period as string) || 'daily';

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        break;
      case 'weekly':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    }

    // Get closed trades within the period
    const trades = await prisma.trade.findMany({
      where: {
        userId,
        isOpen: false,
        closedAt: {
          gte: startDate,
          lte: now,
        },
      },
      orderBy: { closedAt: 'asc' },
    });

    // Build performance data points
    let cumulativePnL = 0;
    const performanceData = trades.map(trade => {
      cumulativePnL += trade.pnl || 0;
      return {
        date: trade.closedAt?.toISOString().split('T')[0] || '',
        pnl: trade.pnl || 0,
        cumulativePnL,
      };
    });

    res.json(performanceData);
  } catch (error) {
    console.error('Get portfolio performance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get open positions detail
router.get('/positions', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const positions = await prisma.trade.findMany({
      where: { userId, isOpen: true },
      orderBy: { openedAt: 'desc' },
    });

    // Calculate unrealized P&L and percentage
    // For now, using 0% change since we don't have real-time prices
    const positionsWithMetrics = positions.map(position => ({
      ...position,
      currentValue: position.entryPrice * position.quantity,
      unrealizedPnL: 0, // TODO: Calculate based on current price
      unrealizedPnLPercent: 0, // TODO: Calculate based on current price
    }));

    res.json(positionsWithMetrics);
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update account balance
router.put('/account-balance', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { accountBalance } = req.body;

    if (typeof accountBalance !== 'number' || accountBalance < 0) {
      res.status(400).json({ error: 'Invalid account balance' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { accountBalance },
      select: { accountBalance: true },
    });

    res.json(user);
  } catch (error) {
    console.error('Update account balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
