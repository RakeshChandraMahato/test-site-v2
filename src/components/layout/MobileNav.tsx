import React from 'react';
import { LayoutDashboard, ShoppingCart, Layers, Database, FileText } from 'lucide-react';
import { useStore } from '@/services/storeContext';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useStore();

  const items = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    ...(user?.role !== 'viewer'
      ? [{ id: 'sales', label: 'Sale', icon: ShoppingCart }]
      : [{ id: 'packing', label: 'Packing', icon: FileText }]),
    { id: 'inventory', label: 'Stock', icon: Layers },
    { id: 'register', label: 'Orders', icon: FileText },
    ...(user?.role === 'owner' || user?.role === 'manager'
      ? [{ id: 'masters', label: 'Masters', icon: Database }]
      : (user?.role !== 'viewer' ? [{ id: 'packing', label: 'Packing', icon: FileText }] : [])),
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-40 w-full border-t border-foreground/10 bg-background/95 backdrop-blur-sm lg:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-14 items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
