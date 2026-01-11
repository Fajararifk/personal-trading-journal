import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { PlusCircle } from 'lucide-react';
import { api, TradeInput } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface TradeFormProps {
  onSuccess?: () => void;
}

const emotionTags = [
  'CONFIDENT',
  'FEARFUL',
  'GREEDY',
  'NEUTRAL',
  'FRUSTRATED',
  'EXCITED',
  'ANXIOUS',
  'CALM',
];

export function TradeForm({ onSuccess }: TradeFormProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    const formData = new FormData(e.currentTarget);
    
    const data: TradeInput = {
      asset: formData.get('asset') as string,
      market: formData.get('market') as 'STOCK' | 'CRYPTO',
      position: formData.get('position') as 'BELI' | 'JUAL',
      entryPrice: parseFloat(formData.get('entryPrice') as string),
      quantity: parseFloat(formData.get('quantity') as string),
      fees: parseFloat(formData.get('fees') as string) || 0,
      openedAt: new Date(formData.get('openedAt') as string).toISOString(),
      notes: formData.get('notes') as string || undefined,
      emotionTag: formData.get('emotionTag') as string || undefined,
    };

    const exitPrice = formData.get('exitPrice') as string;
    const closedAt = formData.get('closedAt') as string;
    
    if (exitPrice && closedAt) {
      data.exitPrice = parseFloat(exitPrice);
      data.closedAt = new Date(closedAt).toISOString();
    }

    setLoading(true);
    setError('');

    try {
      await api.createTrade(token, data);
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Trade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log New Trade</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset">Asset</Label>
              <Input id="asset" name="asset" placeholder="BTC, AAPL, etc." required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="market">Market</Label>
              <Select name="market" defaultValue="CRYPTO">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRYPTO">Crypto</SelectItem>
                  <SelectItem value="STOCK">Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Posisi</Label>
              <Select name="position" defaultValue="BELI">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BELI">Beli</SelectItem>
                  <SelectItem value="JUAL">Jual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" name="quantity" type="number" step="any" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryPrice">Entry Price</Label>
              <Input id="entryPrice" name="entryPrice" type="number" step="any" required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="exitPrice">Exit Price (optional)</Label>
              <Input id="exitPrice" name="exitPrice" type="number" step="any" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="openedAt">Opened At</Label>
              <Input id="openedAt" name="openedAt" type="datetime-local" required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="closedAt">Closed At (optional)</Label>
              <Input id="closedAt" name="closedAt" type="datetime-local" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fees">Fees</Label>
              <Input id="fees" name="fees" type="number" step="any" defaultValue="0" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="emotionTag">Emotion</Label>
              <Select name="emotionTag">
                <SelectTrigger>
                  <SelectValue placeholder="Select emotion" />
                </SelectTrigger>
                <SelectContent>
                  {emotionTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag.charAt(0) + tag.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Trade rationale, observations..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Trade'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
