import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Trash2, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api, Trade } from '@/lib/api';
import { TradeForm } from '@/components/TradeForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatPercent } from '@/lib/utils';

export function TradesPage() {
  const { token } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [closeDialog, setCloseDialog] = useState<Trade | null>(null);
  const [closeLoading, setCloseLoading] = useState(false);

  const fetchTrades = async () => {
    if (!token) return;
    
    try {
      const params: Record<string, string> = {};
      if (filter === 'open') params.isOpen = 'true';
      if (filter === 'closed') params.isOpen = 'false';
      
      const data = await api.getTrades(token, params);
      setTrades(data.trades);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, [token, filter]);

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Are you sure you want to delete this trade?')) return;
    
    try {
      await api.deleteTrade(token, id);
      fetchTrades();
    } catch (err) {
      console.error('Failed to delete trade:', err);
    }
  };

  const handleClose = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token || !closeDialog) return;

    const formData = new FormData(e.currentTarget);
    const exitPrice = parseFloat(formData.get('exitPrice') as string);
    const closedAt = (formData.get('closedAt') as string) || undefined;
    const fees = parseFloat(formData.get('fees') as string) || 0;

    setCloseLoading(true);

    try {
      await api.closeTrade(token, closeDialog.id, {
        exitPrice,
        closedAt: closedAt ? new Date(closedAt).toISOString() : undefined,
        fees,
      });
      setCloseDialog(null);
      fetchTrades();
    } catch (err) {
      console.error('Failed to close trade:', err);
    } finally {
      setCloseLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trades</h1>
          <p className="text-muted-foreground">{total} total trades</p>
        </div>
        <TradeForm onSuccess={fetchTrades} />
      </div>

      <div className="flex gap-2">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trades</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      ) : trades.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No trades found</p>
            <TradeForm onSuccess={fetchTrades} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trades.map((trade) => (
            <Card key={trade.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{trade.asset}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          trade.position === 'LONG' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {trade.position}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          trade.market === 'CRYPTO' ? 'bg-purple-500/20 text-purple-500' : 'bg-blue-500/20 text-blue-500'
                        }`}>
                          {trade.market}
                        </span>
                        {trade.isOpen && (
                          <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-500">
                            OPEN
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {format(new Date(trade.openedAt), 'MMM d, yyyy HH:mm')}
                        {trade.closedAt && (
                          <span> → {format(new Date(trade.closedAt), 'MMM d, yyyy HH:mm')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Entry</div>
                      <div className="font-medium">{formatCurrency(trade.entryPrice)}</div>
                    </div>
                    
                    {trade.exitPrice && (
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Exit</div>
                        <div className="font-medium">{formatCurrency(trade.exitPrice)}</div>
                      </div>
                    )}
                    
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Qty</div>
                      <div className="font-medium">{trade.quantity}</div>
                    </div>

                    {trade.pnl !== null && trade.pnl !== undefined && (
                      <div className="text-right min-w-[100px]">
                        <div className="text-sm text-muted-foreground">P&L</div>
                        <div className={`font-bold ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                          {trade.pnlPercent != null && (
                            <span className="text-xs ml-1">
                              ({formatPercent(trade.pnlPercent!)})
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {trade.isOpen && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCloseDialog(trade)}
                        >
                          Close
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(trade.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {(trade.notes || trade.emotionTag) && (
                  <div className="mt-3 pt-3 border-t flex items-center gap-4">
                    {trade.emotionTag && (
                      <span className="px-2 py-1 rounded text-xs bg-accent">
                        {trade.emotionTag}
                      </span>
                    )}
                    {trade.notes && (
                      <span className="text-sm text-muted-foreground">{trade.notes}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Close Trade Dialog */}
      <Dialog open={!!closeDialog} onOpenChange={() => setCloseDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Trade: {closeDialog?.asset}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleClose} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exitPrice">Exit Price</Label>
              <Input
                id="exitPrice"
                name="exitPrice"
                type="number"
                step="any"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closedAt">Closed At</Label>
              <Input
                id="closedAt"
                name="closedAt"
                type="datetime-local"
                defaultValue={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fees">Additional Fees</Label>
              <Input
                id="fees"
                name="fees"
                type="number"
                step="any"
                defaultValue="0"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCloseDialog(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={closeLoading}>
                {closeLoading ? 'Closing...' : 'Close Trade'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
