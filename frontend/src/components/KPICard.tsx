import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { formatCurrency } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
}

export function KPICard({ title, value, icon: Icon, trend }: KPICardProps) {
  const isPositive = value >= 0;
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${
              isPositive ? 'text-green-500' : 'text-red-500'
            }`}>
              {isPositive ? '+' : ''}{formatCurrency(value)}
            </p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
            isPositive ? 'bg-green-500/10' : 'bg-red-500/10'
          }`}>
            <Icon className={`h-6 w-6 ${
              isPositive ? 'text-green-500' : 'text-red-500'
            }`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
