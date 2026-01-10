import { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface TradeInput {
  asset: string;
  market: 'STOCK' | 'CRYPTO';
  position: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  fees?: number;
  openedAt: string;
  closedAt?: string;
  notes?: string;
  emotionTag?: string;
}

export interface PnLSummary {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
  total: number;
}

export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  expectancy: number;
}

export interface BehaviorWarning {
  type: 'OVERTRADING' | 'REVENGE_TRADING' | 'HIGH_RISK' | 'CONSECUTIVE_LOSS';
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  date: string;
}
