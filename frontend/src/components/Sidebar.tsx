import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  BookOpen,
  BarChart3,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from './ui/button';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/trades', icon: TrendingUp, label: 'Trades' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/journal', icon: BookOpen, label: 'Journal' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onClose, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile menu button - Fixed at top left */}
      <button
        onClick={onToggle}
        className="fixed left-4 top-4 z-50 rounded-lg bg-card p-2 shadow-lg border lg:hidden hover:bg-accent transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Sidebar - Hidden on mobile by default, shown when isOpen is true, always visible on desktop (lg+) */}
      <aside className={`fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <TrendingUp className="h-6 w-6 text-primary" />
          <span className="ml-2 text-lg font-bold">TradeJournal</span>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-4">
          <div className="mb-3 flex items-center gap-3 px-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              {user?.name?.[0] || user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium truncate">{user?.name || 'Trader'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </aside>
    </>
  );
}
