import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAuth } from '@/lib/auth';
import { api, Metrics, Distribution, PeriodProfit } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export function AnalyticsPage() {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [distribution, setDistribution] = useState<Distribution | null>(null);
  const [profitData, setProfitData] = useState<PeriodProfit[]>([]);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      
      try {
        const [metricsData, distData, profitByPeriod] = await Promise.all([
          api.getMetrics(token),
          api.getDistribution(token),
          api.getProfitByPeriod(token, period),
        ]);
        
        setMetrics(metricsData);
        setDistribution(distData);
        setProfitData(profitByPeriod);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const winLossData = metrics ? [
    { name: 'Wins', value: metrics.winningTrades, color: '#10b981' },
    { name: 'Losses', value: metrics.losingTrades, color: '#ef4444' },
  ] : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Analytics</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Deep dive into your trading performance</p>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="text-xs sm:text-sm text-muted-foreground">Win Rate</div>
              <div className="text-2xl sm:text-3xl font-bold text-green-500">{metrics.winRate}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {metrics.winningTrades}W / {metrics.losingTrades}L
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="text-xs sm:text-sm text-muted-foreground">Profit Factor</div>
              <div className={`text-2xl sm:text-3xl font-bold ${metrics.profitFactor >= 1 ? 'text-green-500' : 'text-red-500'}`}>
                {metrics.profitFactor}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Target: &gt; 1.5
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="text-xs sm:text-sm text-muted-foreground">Expectancy</div>
              <div className={`text-2xl sm:text-3xl font-bold ${metrics.expectancy >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(metrics.expectancy)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Per trade average
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="text-xs sm:text-sm text-muted-foreground">Max Drawdown</div>
              <div className="text-2xl sm:text-3xl font-bold text-red-500">
                {formatCurrency(metrics.maxDrawdown)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Largest equity drop
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profit Over Time */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base sm:text-lg">Profit Over Time</CardTitle>
            <Tabs value={period} onValueChange={setPeriod}>
              <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                <TabsTrigger value="daily" className="text-xs sm:text-sm">Daily</TabsTrigger>
                <TabsTrigger value="weekly" className="text-xs sm:text-sm">Weekly</TabsTrigger>
                <TabsTrigger value="monthly" className="text-xs sm:text-sm">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] sm:h-[300px]">
            {profitData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="period" 
                    stroke="#888"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#888" 
                    fontSize={12}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                    formatter={(value: number) => [formatCurrency(value), 'Profit']}
                  />
                  <Bar 
                    dataKey="profit" 
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {/* Win/Loss Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Win/Loss Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] sm:h-[300px]">
              {metrics && metrics.totalTrades > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={winLossData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {winLossData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No trades yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* By Market */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Performance by Market</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] sm:h-[300px]">
              {distribution && distribution.byMarket.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution.byMarket} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" stroke="#888" fontSize={12} />
                    <YAxis type="category" dataKey="market" stroke="#888" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                      formatter={(value: number, name: string) => [
                        name === 'pnl' ? formatCurrency(value) : value,
                        name === 'pnl' ? 'P&L' : 'Trades'
                      ]}
                    />
                    <Bar dataKey="count" fill="#3b82f6" name="count" />
                    <Bar dataKey="pnl" fill="#10b981" name="pnl" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Assets */}
      {distribution && distribution.byAsset.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Performance by Asset</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {distribution.byAsset
                .sort((a, b) => b.pnl - a.pnl)
                .slice(0, 10)
                .map((asset) => (
                  <div key={asset.asset} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <span className="font-medium text-sm sm:text-base truncate">{asset.asset}</span>
                      <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{asset.count} trades</span>
                    </div>
                    <span className={`font-bold text-sm sm:text-base whitespace-nowrap ${asset.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {asset.pnl >= 0 ? '+' : ''}{formatCurrency(asset.pnl)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Avg Win vs Avg Loss */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Risk/Reward Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
              <div className="text-center p-3 sm:p-4 rounded-lg bg-green-500/10">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">Average Win</div>
                <div className="text-xl sm:text-2xl font-bold text-green-500">
                  {formatCurrency(metrics.avgWin)}
                </div>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-lg bg-red-500/10">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">Average Loss</div>
                <div className="text-xl sm:text-2xl font-bold text-red-500">
                  {formatCurrency(metrics.avgLoss)}
                </div>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-lg bg-blue-500/10">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">Risk/Reward Ratio</div>
                <div className="text-xl sm:text-2xl font-bold text-blue-500">
                  {metrics.avgLoss > 0 ? (metrics.avgWin / metrics.avgLoss).toFixed(2) : '∞'}:1
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
