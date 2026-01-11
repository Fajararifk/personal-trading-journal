import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAuth } from '@/lib/auth';
import { api, PnLSummary, Metrics, EquityPoint, BehaviorWarning } from '@/lib/api';
import { KPICard } from '@/components/KPICard';
import { TradeForm } from '@/components/TradeForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/utils';

export function DashboardPage() {
  const { token } = useAuth();
  const [pnl, setPnl] = useState<PnLSummary | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [equityCurve, setEquityCurve] = useState<EquityPoint[]>([]);
  const [warnings, setWarnings] = useState<BehaviorWarning[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!token) return;
    
    try {
      const [pnlData, metricsData, curveData, warningsData] = await Promise.all([
        api.getPnL(token),
        api.getMetrics(token),
        api.getEquityCurve(token),
        api.getBehavior(token),
      ]);
      
      setPnl(pnlData);
      setMetrics(metricsData);
      setEquityCurve(curveData);
      setWarnings(warningsData);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Your trading performance at a glance</p>
        </div>
        <div className="flex-shrink-0">
          <TradeForm onSuccess={fetchData} />
        </div>
      </div>

      {/* Behavior Warnings */}
      {warnings.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
              Behavior Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {warnings.map((warning, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    warning.severity === 'HIGH' ? 'bg-red-500/20 text-red-500' :
                    warning.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-500' :
                    'bg-blue-500/20 text-blue-500'
                  }`}>
                    {warning.type.replace('_', ' ')}
                  </span>
                  <span className="text-muted-foreground">{warning.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Today's P&L"
          value={pnl?.daily ?? 0}
          icon={Calendar}
        />
        <KPICard
          title="This Week"
          value={pnl?.weekly ?? 0}
          icon={TrendingUp}
        />
        <KPICard
          title="This Month"
          value={pnl?.monthly ?? 0}
          icon={DollarSign}
        />
        <KPICard
          title="This Year"
          value={pnl?.yearly ?? 0}
          icon={Target}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {/* Equity Curve */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Equity Curve</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] sm:h-[300px]">
              {equityCurve.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#888"
                      fontSize={12}
                      tickFormatter={(value) => value?.slice(5) || ''}
                    />
                    <YAxis 
                      stroke="#888" 
                      fontSize={12}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                      formatter={(value: number) => [formatCurrency(value), 'Equity']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="equity" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No closed trades yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profit by Trade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Recent Trades P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] sm:h-[300px]">
              {equityCurve.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={equityCurve.slice(-20)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#888"
                      fontSize={12}
                      tickFormatter={(value) => value?.slice(5) || ''}
                    />
                    <YAxis 
                      stroke="#888" 
                      fontSize={12}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                      formatter={(value: number) => [formatCurrency(value), 'P&L']}
                    />
                    <Bar 
                      dataKey="pnl" 
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No closed trades yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Trades</p>
                <p className="text-xl sm:text-2xl font-bold">{metrics.totalTrades}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Win Rate</p>
                <p className="text-xl sm:text-2xl font-bold text-green-500">{metrics.winRate}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Avg Win</p>
                <p className="text-xl sm:text-2xl font-bold text-green-500">{formatCurrency(metrics.avgWin)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Avg Loss</p>
                <p className="text-xl sm:text-2xl font-bold text-red-500">{formatCurrency(metrics.avgLoss)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Profit Factor</p>
                <p className="text-xl sm:text-2xl font-bold">{metrics.profitFactor}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Max Drawdown</p>
                <p className="text-xl sm:text-2xl font-bold text-red-500">{formatCurrency(metrics.maxDrawdown)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Expectancy</p>
                <p className={`text-2xl font-bold ${metrics.expectancy >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(metrics.expectancy)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Winning Trades</p>
                <p className="text-xl sm:text-2xl font-bold text-green-500">{metrics.winningTrades}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Losing Trades</p>
                <p className="text-xl sm:text-2xl font-bold text-red-500">{metrics.losingTrades}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Total P&L</p>
                <p className={`text-2xl font-bold ${(pnl?.total ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(pnl?.total ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
