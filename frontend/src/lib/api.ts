const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  
  register: (email: string, password: string, name?: string) =>
    request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  
  getMe: (token: string) =>
    request<User>('/api/auth/me', { token }),
  
  // Trades
  getTrades: (token: string, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return request<{ trades: Trade[]; total: number }>(`/api/trades${query}`, { token });
  },
  
  getTrade: (token: string, id: string) =>
    request<Trade>(`/api/trades/${id}`, { token }),
  
  createTrade: (token: string, data: TradeInput) =>
    request<Trade>('/api/trades', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
  
  updateTrade: (token: string, id: string, data: Partial<TradeInput>) =>
    request<Trade>(`/api/trades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),
  
  closeTrade: (token: string, id: string, data: { exitPrice: number; closedAt?: string; fees?: number }) =>
    request<Trade>(`/api/trades/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
  
  deleteTrade: (token: string, id: string) =>
    request<{ message: string }>(`/api/trades/${id}`, {
      method: 'DELETE',
      token,
    }),
  
  // Analytics
  getPnL: (token: string) =>
    request<PnLSummary>('/api/analytics/pnl', { token }),
  
  getMetrics: (token: string, period?: string) => {
    const query = period ? `?period=${period}` : '';
    return request<Metrics>(`/api/analytics/metrics${query}`, { token });
  },
  
  getEquityCurve: (token: string) =>
    request<EquityPoint[]>('/api/analytics/equity-curve', { token }),
  
  getProfitByPeriod: (token: string, period: string) =>
    request<PeriodProfit[]>(`/api/analytics/profit-by-period?period=${period}`, { token }),
  
  getBehavior: (token: string) =>
    request<BehaviorWarning[]>('/api/analytics/behavior', { token }),
  
  getDistribution: (token: string) =>
    request<Distribution>('/api/analytics/distribution', { token }),
  
  // Journal
  getJournals: (token: string, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return request<{ entries: Journal[]; total: number }>(`/api/journal${query}`, { token });
  },
  
  createJournal: (token: string, data: JournalInput) =>
    request<Journal>('/api/journal', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
  
  deleteJournal: (token: string, id: string) =>
    request<{ message: string }>(`/api/journal/${id}`, {
      method: 'DELETE',
      token,
    }),
};

// Types
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface Trade {
  id: string;
  asset: string;
  market: 'STOCK' | 'CRYPTO';
  position: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  fees: number;
  openedAt: string;
  closedAt?: string;
  notes?: string;
  emotionTag?: string;
  pnl?: number;
  pnlPercent?: number;
  isOpen: boolean;
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

export interface Metrics {
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

export interface EquityPoint {
  date: string;
  equity: number;
  pnl: number;
}

export interface PeriodProfit {
  period: string;
  profit: number;
}

export interface BehaviorWarning {
  type: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  date: string;
}

export interface Distribution {
  byAsset: { asset: string; count: number; pnl: number }[];
  byMarket: { market: string; count: number; pnl: number }[];
  byPosition: { position: string; count: number; pnl: number }[];
}

export interface Journal {
  id: string;
  date: string;
  content: string;
  mood?: number;
  lessons?: string;
}

export interface JournalInput {
  date: string;
  content: string;
  mood?: number;
  lessons?: string;
}
