import { useState, useEffect } from 'react';
import { Shield, Calculator, Target, AlertTriangle, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api, RiskSettings, PositionSizeResult, StopLossResult, RiskRewardResult } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';

export function RiskManagementPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<RiskSettings>({ accountBalance: 0, riskPerTrade: 2 });
  const [loading, setLoading] = useState(true);

  // Position Size Calculator State
  const [psAccountBalance, setPsAccountBalance] = useState('');
  const [psRiskPercent, setPsRiskPercent] = useState('');
  const [psEntryPrice, setPsEntryPrice] = useState('');
  const [psStopLoss, setPsStopLoss] = useState('');
  const [psResult, setPsResult] = useState<PositionSizeResult | null>(null);

  // Stop Loss Calculator State
  const [slEntryPrice, setSlEntryPrice] = useState('');
  const [slRiskPercent, setSlRiskPercent] = useState('');
  const [slPosition, setSlPosition] = useState<'LONG' | 'SHORT'>('LONG');
  const [slResult, setSlResult] = useState<StopLossResult | null>(null);

  // Risk/Reward Calculator State
  const [rrEntryPrice, setRrEntryPrice] = useState('');
  const [rrStopLoss, setRrStopLoss] = useState('');
  const [rrTargetPrice, setRrTargetPrice] = useState('');
  const [rrPosition, setRrPosition] = useState<'LONG' | 'SHORT'>('LONG');
  const [rrResult, setRrResult] = useState<RiskRewardResult | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const fetchSettings = async () => {
    if (!token) return;

    try {
      const data = await api.getRiskSettings(token);
      setSettings(data);
      setPsAccountBalance(data.accountBalance.toString());
      setPsRiskPercent(data.riskPerTrade.toString());
      setSlRiskPercent(data.riskPerTrade.toString());
    } catch (err) {
      console.error('Failed to fetch risk settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    if (!token) return;

    try {
      const accountBalance = parseFloat(psAccountBalance);
      const riskPerTrade = parseFloat(psRiskPercent);

      if (isNaN(accountBalance) || isNaN(riskPerTrade)) {
        alert('Invalid values');
        return;
      }

      await api.updateRiskSettings(token, { accountBalance, riskPerTrade });
      await fetchSettings();
      alert('Settings updated successfully');
    } catch (err) {
      console.error('Failed to update settings:', err);
      alert('Failed to update settings');
    }
  };

  const calculatePositionSize = async () => {
    if (!token) return;

    try {
      const result = await api.calculatePositionSize(token, {
        accountBalance: parseFloat(psAccountBalance),
        riskPercent: parseFloat(psRiskPercent),
        entryPrice: parseFloat(psEntryPrice),
        stopLoss: parseFloat(psStopLoss),
      });
      setPsResult(result);
    } catch (err) {
      console.error('Failed to calculate position size:', err);
      alert('Failed to calculate. Please check your inputs.');
    }
  };

  const calculateStopLoss = async () => {
    if (!token) return;

    try {
      const result = await api.calculateStopLoss(token, {
        entryPrice: parseFloat(slEntryPrice),
        riskPercent: parseFloat(slRiskPercent),
        position: slPosition,
      });
      setSlResult(result);
    } catch (err) {
      console.error('Failed to calculate stop loss:', err);
      alert('Failed to calculate. Please check your inputs.');
    }
  };

  const calculateRiskReward = async () => {
    if (!token) return;

    try {
      const result = await api.calculateRiskReward(token, {
        entryPrice: parseFloat(rrEntryPrice),
        stopLoss: parseFloat(rrStopLoss),
        targetPrice: parseFloat(rrTargetPrice),
        position: rrPosition,
      });
      setRrResult(result);
    } catch (err) {
      console.error('Failed to calculate risk/reward:', err);
      alert('Failed to calculate. Please check your inputs.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Risk Management</h1>
          <p className="text-muted-foreground">Calculate position sizes, stop losses, and risk/reward ratios</p>
        </div>
      </div>

      {/* Risk Settings */}
      <Card className="border-blue-500/50 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-500">
            <Settings className="h-5 w-5" />
            Risk Settings
          </CardTitle>
          <CardDescription>Configure your default risk parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Account Balance (Rp)</Label>
              <Input
                type="number"
                value={psAccountBalance}
                onChange={(e) => setPsAccountBalance(e.target.value)}
                placeholder="10000000"
              />
            </div>
            <div className="space-y-2">
              <Label>Risk Per Trade (%)</Label>
              <Input
                type="number"
                value={psRiskPercent}
                onChange={(e) => setPsRiskPercent(e.target.value)}
                placeholder="2"
                step="0.1"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleUpdateSettings} className="w-full">
                Save Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculators Grid */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* Position Size Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Position Size Calculator
            </CardTitle>
            <CardDescription>Calculate how many shares/units to buy based on your risk</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Account Balance (Rp)</Label>
              <Input
                type="number"
                value={psAccountBalance}
                onChange={(e) => setPsAccountBalance(e.target.value)}
                placeholder="10000000"
              />
            </div>
            <div className="space-y-2">
              <Label>Risk Per Trade (%)</Label>
              <Input
                type="number"
                value={psRiskPercent}
                onChange={(e) => setPsRiskPercent(e.target.value)}
                placeholder="2"
                step="0.1"
              />
            </div>
            <div className="space-y-2">
              <Label>Entry Price (Rp)</Label>
              <Input
                type="number"
                value={psEntryPrice}
                onChange={(e) => setPsEntryPrice(e.target.value)}
                placeholder="4500"
              />
            </div>
            <div className="space-y-2">
              <Label>Stop Loss (Rp)</Label>
              <Input
                type="number"
                value={psStopLoss}
                onChange={(e) => setPsStopLoss(e.target.value)}
                placeholder="4300"
              />
            </div>
            <Button onClick={calculatePositionSize} className="w-full">
              Calculate
            </Button>

            {psResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Position Size:</span>
                  <span className="font-bold">{psResult.positionSize.toLocaleString('id-ID')} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Value:</span>
                  <span className="font-bold">{formatCurrency(psResult.totalValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk Amount:</span>
                  <span className="font-bold text-red-500">{formatCurrency(psResult.riskAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Portfolio %:</span>
                  <span className="font-bold">{psResult.portfolioPercent.toFixed(2)}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stop Loss Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Stop Loss Calculator
            </CardTitle>
            <CardDescription>Calculate optimal stop loss based on risk percentage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Entry Price (Rp)</Label>
              <Input
                type="number"
                value={slEntryPrice}
                onChange={(e) => setSlEntryPrice(e.target.value)}
                placeholder="4500"
              />
            </div>
            <div className="space-y-2">
              <Label>Risk Percentage (%)</Label>
              <Input
                type="number"
                value={slRiskPercent}
                onChange={(e) => setSlRiskPercent(e.target.value)}
                placeholder="5"
                step="0.1"
              />
            </div>
            <div className="space-y-2">
              <Label>Position Type</Label>
              <Select value={slPosition} onValueChange={(v: 'LONG' | 'SHORT') => setSlPosition(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LONG">LONG (Buy)</SelectItem>
                  <SelectItem value="SHORT">SHORT (Sell)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={calculateStopLoss} className="w-full">
              Calculate
            </Button>

            {slResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stop Loss Price:</span>
                  <span className="font-bold text-red-500">{formatCurrency(slResult.stopLoss)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance:</span>
                  <span className="font-bold">{formatCurrency(slResult.distance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance %:</span>
                  <span className="font-bold">{slResult.distancePercent.toFixed(2)}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk/Reward Calculator */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Risk/Reward Ratio Calculator
            </CardTitle>
            <CardDescription>Analyze if a trade has favorable risk/reward ratio (minimum 1:2 recommended)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Entry Price (Rp)</Label>
                <Input
                  type="number"
                  value={rrEntryPrice}
                  onChange={(e) => setRrEntryPrice(e.target.value)}
                  placeholder="4500"
                />
              </div>
              <div className="space-y-2">
                <Label>Stop Loss (Rp)</Label>
                <Input
                  type="number"
                  value={rrStopLoss}
                  onChange={(e) => setRrStopLoss(e.target.value)}
                  placeholder="4300"
                />
              </div>
              <div className="space-y-2">
                <Label>Target Price (Rp)</Label>
                <Input
                  type="number"
                  value={rrTargetPrice}
                  onChange={(e) => setRrTargetPrice(e.target.value)}
                  placeholder="4900"
                />
              </div>
              <div className="space-y-2">
                <Label>Position Type</Label>
                <Select value={rrPosition} onValueChange={(v: 'LONG' | 'SHORT') => setRrPosition(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LONG">LONG</SelectItem>
                    <SelectItem value="SHORT">SHORT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={calculateRiskReward} className="w-full mt-4">
              Calculate Risk/Reward
            </Button>

            {rrResult && (
              <div className="mt-4 p-6 bg-muted rounded-lg">
                <div className="grid gap-4 md:grid-cols-3 mb-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Risk</div>
                    <div className="text-2xl font-bold text-red-500">{formatCurrency(rrResult.risk)}</div>
                    <div className="text-xs text-muted-foreground">{rrResult.riskPercent.toFixed(2)}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Reward</div>
                    <div className="text-2xl font-bold text-green-500">{formatCurrency(rrResult.reward)}</div>
                    <div className="text-xs text-muted-foreground">{rrResult.rewardPercent.toFixed(2)}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">R/R Ratio</div>
                    <div className="text-3xl font-bold">1:{rrResult.riskRewardRatio.toFixed(2)}</div>
                  </div>
                </div>

                <div className={`flex items-center justify-center gap-2 p-3 rounded ${
                  rrResult.isGoodTrade
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-red-500/10 text-red-500'
                }`}>
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">
                    {rrResult.isGoodTrade
                      ? '✓ Good Trade - Risk/Reward ratio is favorable (≥2:1)'
                      : '✗ Poor Trade - Risk/Reward ratio is too low (<2:1)'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
