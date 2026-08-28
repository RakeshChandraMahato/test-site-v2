import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/services/storeContext';
import { UserRole } from '@/types/auth';
import { Badge } from '@/components/ui/badge';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { CommandPalette } from '@/components/search/CommandPalette';
import {
  Menu,
  X,
  Shield,
  Search,
  ChevronDown,
  ShoppingCart,
  Calendar,
  FileText,
  Package,
  Layers,
  Truck,
  Sparkles,
  Calculator,
  BarChart3,
  TrendingUp,
  Database,
  LayoutDashboard
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string, contextId?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (id: string, contextId?: string) => {
    setActiveTab(id, contextId);
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  };

  const getRoleBadgeVariant = (role?: UserRole): 'default' | 'secondary' | 'success' | 'outline' => {
    if (role === 'owner') return 'default';
    if (role === 'manager') return 'success';
    if (role === 'staff') return 'secondary';
    return 'outline';
  };

  // Grouped Navigation Structure
  const salesGroup = [
    ...(user?.role !== 'viewer' ? [{ id: 'sales', label: 'New Sale Order', desc: 'Direct POS sale with instant deduction', icon: ShoppingCart }] : []),
    { id: 'reservations', label: 'Reservations & Deliveries', desc: 'Promised delivery board & holds', icon: Calendar },
    { id: 'register', label: 'Orders Register', desc: 'History, snapshots & cancellation', icon: FileText },
    { id: 'packing', label: 'Packing Sheets', desc: 'Box photos & item weight pull-lists', icon: Package },
  ];

  const inventoryGroup = [
    { id: 'inventory', label: 'Stock Balances', desc: 'Godown buckets, transfers & repairs', icon: Layers },
    ...(user?.role === 'owner' || user?.role === 'manager'
      ? [{ id: 'purchases', label: 'Inward Purchases', desc: 'Landed cost math & restocking', icon: Truck }]
      : []),
    { id: 'samples', label: 'Sample Recipe Master', desc: 'Batch assemblies, MRP & samples', icon: Sparkles },
  ];

  const insightsGroup = [
    ...(user?.role !== 'viewer' ? [{ id: 'calculator', label: 'Price Calculator', desc: 'Live quote builder with margin math', icon: Calculator }] : []),
    { id: 'reports', label: 'Reports & Ledger Audit', desc: 'Raw material usage & CSV export', icon: BarChart3 },
    ...(user?.role === 'owner'
      ? [{ id: 'profit', label: 'Executive Financials', desc: 'Confidential GP & Net profit engine', icon: TrendingUp }]
      : []),
  ];

  const isSalesActive = salesGroup.some((i) => i.id === activeTab);
  const isInventoryActive = inventoryGroup.some((i) => i.id === activeTab);
  const isInsightsActive = insightsGroup.some((i) => i.id === activeTab);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-foreground/10 bg-background/95 backdrop-blur-sm pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-foreground p-1.5 -ml-1.5 rounded-md hover:bg-secondary/40"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <button
              onClick={() => handleNavClick('dashboard')}
              className="text-lg font-serif font-bold tracking-tight flex items-center gap-2"
            >
              ASJ
            </button>
          </div>

          {/* Desktop Grouped Navigation */}
          <nav ref={navRef} className="hidden lg:flex items-center gap-1">
            {/* 1. Overview */}
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors rounded ${
                activeTab === 'dashboard'
                  ? 'bg-foreground text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              }`}
            >
              Overview
            </button>

            {/* 2. Sales & Orders Dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'sales' ? null : 'sales')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors rounded ${
                  isSalesActive
                    ? 'bg-foreground text-background font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                }`}
              >
                <span>Sales</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${openDropdown === 'sales' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'sales' && (
                <div className="absolute top-full left-0 mt-1.5 w-64 p-1.5 bg-background border border-foreground/15 shadow-xl rounded-none z-50 animate-view-fade">
                  {salesGroup.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full text-left p-2.5 flex items-start gap-3 hover:bg-secondary/40 transition-colors ${
                          activeTab === item.id ? 'bg-secondary/50 font-medium' : ''
                        }`}
                      >
                        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-foreground">{item.label}</p>
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Inventory & Restocking Dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'inventory' ? null : 'inventory')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors rounded ${
                  isInventoryActive
                    ? 'bg-foreground text-background font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                }`}
              >
                <span>Inventory</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${openDropdown === 'inventory' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'inventory' && (
                <div className="absolute top-full left-0 mt-1.5 w-64 p-1.5 bg-background border border-foreground/15 shadow-xl rounded-none z-50 animate-view-fade">
                  {inventoryGroup.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full text-left p-2.5 flex items-start gap-3 hover:bg-secondary/40 transition-colors ${
                          activeTab === item.id ? 'bg-secondary/50 font-medium' : ''
                        }`}
                      >
                        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-foreground">{item.label}</p>
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Insights & Financials Dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'insights' ? null : 'insights')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors rounded ${
                  isInsightsActive
                    ? 'bg-foreground text-background font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                }`}
              >
                <span>Insights</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${openDropdown === 'insights' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'insights' && (
                <div className="absolute top-full left-0 mt-1.5 w-64 p-1.5 bg-background border border-foreground/15 shadow-xl rounded-none z-50 animate-view-fade">
                  {insightsGroup.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full text-left p-2.5 flex items-start gap-3 hover:bg-secondary/40 transition-colors ${
                          activeTab === item.id ? 'bg-secondary/50 font-medium' : ''
                        }`}
                      >
                        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-foreground">{item.label}</p>
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 5. Masters (Owner & Manager Only) */}
            {(user?.role === 'owner' || user?.role === 'manager') && (
              <button
                onClick={() => handleNavClick('masters')}
                className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors rounded ${
                  activeTab === 'masters'
                    ? 'bg-foreground text-background font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                }`}
              >
                Masters
              </button>
            )}
          </nav>

          {/* Right Header Tools: Global Search + Role Switcher + Reset */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs border border-foreground/15 hover:border-foreground/30 rounded-none transition-colors cursor-pointer bg-secondary/20"
              title="Global Search (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden sm:inline text-muted-foreground">Search...</span>
              <kbd className="hidden sm:inline text-[9px] bg-background border border-foreground/20 px-1 py-0.2 rounded font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </button>

            <button
              onClick={() => setAuthOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-foreground/15 hover:border-foreground/30 rounded-none transition-colors cursor-pointer gpu-tap"
              title="Account & Security"
            >
              <Shield className="h-3.5 w-3.5 text-foreground" />
              <Badge variant={getRoleBadgeVariant(user?.role)} className="uppercase text-[10px] tracking-wider py-0 px-1">
                {user?.role || 'Guest'}
              </Badge>
            </button>
          </div>
        </div>
      </header>

      {/* Auth & Search Dialogs */}
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <CommandPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onNavigate={handleNavClick}
      />

      {/* Mobile Grouped Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-14 z-50 bg-background/95 backdrop-blur-md lg:hidden p-6 overflow-y-auto space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-foreground/10">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Operations Navigation</p>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setAuthOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs text-foreground font-medium"
            >
              <Shield className="h-3.5 w-3.5" /> Role: <span className="uppercase font-bold">{user?.role || 'Guest'}</span>
            </button>
          </div>

          {/* Home */}
          <div>
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`w-full py-2.5 text-left text-sm font-semibold flex items-center justify-between ${
                activeTab === 'dashboard' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="h-4 w-4" />
                <span>Overview Dashboard</span>
              </div>
              {activeTab === 'dashboard' && <span className="text-[10px] font-mono text-foreground">ACTIVE</span>}
            </button>
          </div>

          {/* Sales Section */}
          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Sales & Dispatch</p>
            <div className="divide-y divide-foreground/5">
              {salesGroup.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full py-3 text-left text-sm flex items-center justify-between ${
                      activeTab === item.id ? 'text-foreground font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    {activeTab === item.id && <span className="text-[10px] font-mono text-foreground">ACTIVE</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inventory Section */}
          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Inventory & Supply</p>
            <div className="divide-y divide-foreground/5">
              {inventoryGroup.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full py-3 text-left text-sm flex items-center justify-between ${
                      activeTab === item.id ? 'text-foreground font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    {activeTab === item.id && <span className="text-[10px] font-mono text-foreground">ACTIVE</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Insights Section */}
          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Insights & Finance</p>
            <div className="divide-y divide-foreground/5">
              {insightsGroup.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full py-3 text-left text-sm flex items-center justify-between ${
                      activeTab === item.id ? 'text-foreground font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    {activeTab === item.id && <span className="text-[10px] font-mono text-foreground">ACTIVE</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Masters Section */}
          {(user?.role === 'owner' || user?.role === 'manager') && (
            <div className="space-y-1 pt-2 border-t border-foreground/10">
              <button
                onClick={() => handleNavClick('masters')}
                className={`w-full py-3 text-left text-sm flex items-center justify-between ${
                  activeTab === 'masters' ? 'text-foreground font-bold' : 'text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Database className="h-4 w-4" />
                  <span>Master Data & Rates</span>
                </div>
                {activeTab === 'masters' && <span className="text-[10px] font-mono text-foreground">ACTIVE</span>}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
