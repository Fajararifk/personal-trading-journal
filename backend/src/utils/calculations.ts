import { Trade } from '@prisma/client';
import { PerformanceMetrics, BehaviorWarning } from '../types';

export function calculatePnL(
  position: 'BELI' | 'JUAL',
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  fees: number = 0
): { pnl: number; pnlPercent: number } {
  let pnl: number;

  if (position === 'BELI') {
    pnl = (exitPrice - entryPrice) * quantity - fees;
  } else {
    pnl = (entryPrice - exitPrice) * quantity - fees;
  }

  const investment = entryPrice * quantity;
  const pnlPercent = investment > 0 ? (pnl / investment) * 100 : 0;

  return { pnl, pnlPercent };
}

export function calculateMetrics(trades: Trade[]): PerformanceMetrics {
  const closedTrades = trades.filter(t => !t.isOpen && t.pnl !== null);
  
  if (closedTrades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      expectancy: 0,
    };
  }
  
  const winningTrades = closedTrades.filter(t => (t.pnl ?? 0) > 0);
  const losingTrades = closedTrades.filter(t => (t.pnl ?? 0) < 0);
  
  const grossProfit = winningTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0));
  
  const winRate = closedTrades.length > 0 
    ? (winningTrades.length / closedTrades.length) * 100 
    : 0;
    
  const avgWin = winningTrades.length > 0 
    ? grossProfit / winningTrades.length 
    : 0;
    
  const avgLoss = losingTrades.length > 0 
    ? grossLoss / losingTrades.length 
    : 0;
    
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  
  // Calculate max drawdown
  const maxDrawdown = calculateMaxDrawdown(closedTrades);
  
  // Expectancy = (Win Rate × Avg Win) - (Loss Rate × Avg Loss)
  const lossRate = 100 - winRate;
  const expectancy = (winRate / 100 * avgWin) - (lossRate / 100 * avgLoss);
  
  return {
    totalTrades: closedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: Math.round(winRate * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    expectancy: Math.round(expectancy * 100) / 100,
  };
}

function calculateMaxDrawdown(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  
  // Sort by closed date
  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = a.closedAt ? new Date(a.closedAt).getTime() : 0;
    const dateB = b.closedAt ? new Date(b.closedAt).getTime() : 0;
    return dateA - dateB;
  });
  
  let peak = 0;
  let maxDrawdown = 0;
  let cumulative = 0;
  
  for (const trade of sortedTrades) {
    cumulative += trade.pnl ?? 0;
    if (cumulative > peak) {
      peak = cumulative;
    }
    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}

export function detectBehaviorWarnings(trades: Trade[], accountBalance: number = 10000): BehaviorWarning[] {
  const warnings: BehaviorWarning[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get today's trades
  const todayTrades = trades.filter(t => {
    const tradeDate = new Date(t.openedAt);
    tradeDate.setHours(0, 0, 0, 0);
    return tradeDate.getTime() === today.getTime();
  });
  
  // Overtrading: More than 10 trades in a day
  if (todayTrades.length > 10) {
    warnings.push({
      type: 'OVERTRADING',
      message: `You've made ${todayTrades.length} trades today. Consider slowing down.`,
      severity: todayTrades.length > 15 ? 'HIGH' : 'MEDIUM',
      date: today.toISOString(),
    });
  }
  
  // Revenge trading: Opening new trade within 5 minutes of a loss
  const closedTrades = trades.filter(t => !t.isOpen && t.closedAt);
  for (let i = 1; i < closedTrades.length; i++) {
    const prevTrade = closedTrades[i - 1];
    const currTrade = closedTrades[i];
    
    if (prevTrade.pnl && prevTrade.pnl < 0 && prevTrade.closedAt) {
      const timeDiff = new Date(currTrade.openedAt).getTime() - new Date(prevTrade.closedAt).getTime();
      if (timeDiff < 5 * 60 * 1000) { // 5 minutes
        warnings.push({
          type: 'REVENGE_TRADING',
          message: 'Possible revenge trade detected. You opened a position quickly after a loss.',
          severity: 'HIGH',
          date: currTrade.openedAt.toISOString(),
        });
        break;
      }
    }
  }
  
  // Risk > 2%: Single trade risking more than 2% of account
  for (const trade of todayTrades) {
    const riskAmount = trade.entryPrice * trade.quantity;
    const riskPercent = (riskAmount / accountBalance) * 100;
    if (riskPercent > 2) {
      warnings.push({
        type: 'HIGH_RISK',
        message: `Trade on ${trade.asset} risks ${riskPercent.toFixed(1)}% of account (>${2}% limit).`,
        severity: riskPercent > 5 ? 'HIGH' : 'MEDIUM',
        date: trade.openedAt.toISOString(),
      });
    }
  }
  
  // Consecutive losses: 3 or more losses in a row
  const recentClosed = closedTrades.slice(-5);
  let consecutiveLosses = 0;
  for (let i = recentClosed.length - 1; i >= 0; i--) {
    if ((recentClosed[i].pnl ?? 0) < 0) {
      consecutiveLosses++;
    } else {
      break;
    }
  }
  
  if (consecutiveLosses >= 3) {
    warnings.push({
      type: 'CONSECUTIVE_LOSS',
      message: `You have ${consecutiveLosses} consecutive losses. Consider taking a break.`,
      severity: consecutiveLosses >= 5 ? 'HIGH' : 'MEDIUM',
      date: today.toISOString(),
    });
  }
  
  return warnings;
}

export function getDateRanges() {
  const now = new Date();
  
  // Today
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  
  // This week (ISO week starts Monday)
  const weekStart = new Date(now);
  const day = weekStart.getDay();
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  
  // This month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);
  
  // This year
  const yearStart = new Date(now.getFullYear(), 0, 1);
  yearStart.setHours(0, 0, 0, 0);
  
  return {
    today: { start: todayStart, end: todayEnd },
    week: { start: weekStart, end: todayEnd },
    month: { start: monthStart, end: todayEnd },
    year: { start: yearStart, end: todayEnd },
  };
}
