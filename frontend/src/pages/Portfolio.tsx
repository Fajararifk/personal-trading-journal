import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, PieChart as PieChartIcon, DollarSign, Briefcase } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useAuth } from '@/lib/auth';
import { api, PortfolioSummary, AssetAllocation, PerformancePoint, Position } from '@/lib/api';
import { KPICard } from '@/components/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function PortfolioPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [allocation, setAllocation] = useState<AssetAllocation[]>([]);
  const [performance, setPerformance] = useState<PerformancePoint[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');
  const [editingBalance, setEditingBalance] = useState(false);
  const [newBalance, setNewBalance] = useState('');

  const fetchData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const [summaryData, allocationData, performanceData, positionsData] = await Promise.all([
        api.getPortfolioSummary(token),
        api.getAssetAllocation(token),
        api.getPortfolioPerformance(token, period),
        api.getOpenPositions(token),
      ]);

      setSummary(summaryData);
      setAllocation(allocationData);
      setPerformance(performanceData);
      setPositions(positionsData);
      setNewBalance(summaryData.accountBalance.toString());
    } catch (err) {
      console.error('Failed to fetch portfolio data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, period]);

  const handleUpdateBalance = async () => {
    if (!token) return;

    try {
      const balance = parseFloat(newBalance);
      if (isNaN(balance) || balance < 0) {
        alert('Invalid balance amount');
        return;
      }

      await api.updateAccountBalance(token, balance);
      await fetchData();
      setEditingBalance(false);
    } catch (err) {
      console.error('Failed to update balance:', err);
      alert('Failed to update account balance');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const totalPnL = (summary?.realizedPnL || 0) + (summary?.unrealizedPnL || 0);
  const totalReturn = summary?.investedAmount && summary.investedAmount > 0
    ? ((totalPnL / summary.investedAmount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground">Your portfolio overview and performance</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(summary?.totalValue || 0)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <Wallet className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Account Balance</p>
                <div className="flex items-center gap-2 mt-1">
                  {editingBalance ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={newBalance}
                        onChange={(e) => setNewBalance(e.target.value)}
                        className="w-32 h-8"
                      />
                      <Button size="sm" onClick={handleUpdateBalance}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingBalance(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold">{formatCurrency(summary?.accountBalance || 0)}</p>
                      <Button size="sm" variant="ghost" onClick={() => setEditingBalance(true)}>Edit</Button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                <DollarSign className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <KPICard
          title="Realized P&L"
          value={summary?.realizedPnL || 0}
          icon={summary && summary.realizedPnL >= 0 ? TrendingUp : TrendingDown}
        />

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Positions</p>
                <p className="text-2xl font-bold mt-1">{summary?.openPositions || 0}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
                <Briefcase className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Asset Allocation Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Asset Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {allocation.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocation}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.asset} (${((entry.value / allocation.reduce((sum, a) => sum + a.value, 0)) * 100).toFixed(1)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {allocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No open positions
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Portfolio Performance</CardTitle>
              <Tabs value={period} onValueChange={setPeriod}>
                <TabsList>
                  <TabsTrigger value="daily">30D</TabsTrigger>
                  <TabsTrigger value="weekly">90D</TabsTrigger>
                  <TabsTrigger value="monthly">1Y</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {performance.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performance}>
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
                      tickFormatter={(value) => `Rp${value}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                      formatter={(value: number) => [formatCurrency(value), 'Cumulative P&L']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cumulativePnL"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="Cumulative P&L"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No performance data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Open Positions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Asset</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Position</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Entry Price</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Quantity</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Current Value</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Opened At</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr key={position.id} className="border-b">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{position.asset}</div>
                          <div className="text-xs text-muted-foreground">{position.market}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          position.position === 'LONG'
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-red-500/10 text-red-500'
                        }`}>
                          {position.position}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">{formatCurrency(position.entryPrice)}</td>
                      <td className="text-right py-3 px-4">{position.quantity}</td>
                      <td className="text-right py-3 px-4 font-medium">{formatCurrency(position.currentValue)}</td>
                      <td className="text-right py-3 px-4 text-sm text-muted-foreground">
                        {new Date(position.openedAt).toLocaleDateString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No open positions
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
