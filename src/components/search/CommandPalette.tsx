import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/services/storeContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, ShoppingBag, Calendar, Package, Truck, ArrowRight, LayoutDashboard, FileText, Layers, Calculator, Database } from 'lucide-react';
import { formatINR } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (tab: string, contextId?: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange, onNavigate }) => {
  const { orders, reservations, boxes, rawMaterials, customers, suppliers, user } = useStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [open]);

  // Global Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const q = query.toLowerCase().trim();

  // 1. Navigation Shortcuts
  const navShortcuts = [
    { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard, keywords: 'home overview analytics' },
    ...(user?.role !== 'viewer' ? [{ id: 'sales', label: 'New Sale Order', icon: ShoppingBag, keywords: 'new sale create order pos' }] : []),
    { id: 'reservations', label: 'Reservations & Delivery Board', icon: Calendar, keywords: 'reserve delivery schedule advance' },
    { id: 'register', label: 'Orders Register', icon: FileText, keywords: 'orders list cancel sales' },
    { id: 'packing', label: 'Packing Sheets', icon: Package, keywords: 'packing print sheet kg weights' },
    { id: 'inventory', label: 'Inventory & Stock Ledgers', icon: Layers, keywords: 'stock balances transfer damage repair' },
    ...(user?.role === 'owner' || user?.role === 'manager' ? [{ id: 'purchases', label: 'Inward Purchases', icon: Truck, keywords: 'purchase vendor inward stock bills' }] : []),
    ...(user?.role !== 'viewer' ? [{ id: 'calculator', label: 'Price Calculator', icon: Calculator, keywords: 'quote quotation calculator markup' }] : []),
    ...(user?.role === 'owner' || user?.role === 'manager' ? [{ id: 'masters', label: 'Master Data & Settings', icon: Database, keywords: 'boxes dry fruits rates suppliers godowns' }] : []),
  ].filter((s) => !q || s.label.toLowerCase().includes(q) || s.keywords.includes(q));

  // 2. Orders Search
  const matchingOrders = orders
    .filter((o) => {
      if (!q) return false;
      const cust = customers.find((c) => c.id === o.customerId);
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        cust?.name.toLowerCase().includes(q) ||
        cust?.phone?.toLowerCase().includes(q) ||
        cust?.companyName?.toLowerCase().includes(q)
      );
    })
    .slice(0, 4);

  // 3. Reservations Search
  const matchingReservations = reservations
    .filter((r) => {
      if (!q) return false;
      const cust = customers.find((c) => c.id === r.customerId);
      return (
        r.reservationNumber.toLowerCase().includes(q) ||
        cust?.name.toLowerCase().includes(q) ||
        cust?.phone?.toLowerCase().includes(q) ||
        r.deliveryAddress?.toLowerCase().includes(q)
      );
    })
    .slice(0, 4);

  // 4. Boxes Search
  const matchingBoxes = boxes
    .filter((b) => {
      if (!q) return false;
      return b.boxCode.toLowerCase().includes(q) || b.boxName?.toLowerCase().includes(q);
    })
    .slice(0, 4);

  // 5. Raw Materials Search
  const matchingMaterials = rawMaterials
    .filter((rm) => {
      if (!q) return false;
      return rm.displayName.toLowerCase().includes(q) || rm.variant?.toLowerCase().includes(q);
    })
    .slice(0, 4);

  // 6. Customers Search
  const matchingCustomers = customers
    .filter((c) => {
      if (!q) return false;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.companyName?.toLowerCase().includes(q)
      );
    })
    .slice(0, 4);

  // 7. Suppliers Search
  const matchingSuppliers = suppliers
    .filter((s) => {
      if (!q) return false;
      return s.name.toLowerCase().includes(q) || s.phone?.toLowerCase().includes(q) || s.taxDetails?.toLowerCase().includes(q);
    })
    .slice(0, 4);

  const hasResults =
    matchingOrders.length > 0 ||
    matchingReservations.length > 0 ||
    matchingBoxes.length > 0 ||
    matchingMaterials.length > 0 ||
    matchingCustomers.length > 0 ||
    matchingSuppliers.length > 0 ||
    navShortcuts.length > 0;

  const handleSelect = (tab: string, contextId?: string) => {
    onOpenChange(false);
    onNavigate(tab, contextId);
  };

  return (
    <Dialog open={openOpenSafe(open)} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-xl overflow-hidden shadow-2xl border-foreground/15">
        <div className="flex items-center px-4 border-b border-foreground/10 bg-background">
          <Search className="h-4 w-4 text-muted-foreground shrink-0 mr-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders, boxes, customers, raw materials, or pages... (ESC to close)"
            className="w-full py-3.5 bg-transparent text-sm focus:outline-none text-foreground placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5"
            >
              Clear
            </button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {/* Navigation Shortcuts */}
          {(!q || navShortcuts.length > 0) && (
            <div>
              <p className="px-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                {q ? 'Matching Modules' : 'Quick Navigation'}
              </p>
              <div className="space-y-0.5">
                {navShortcuts.slice(0, q ? 3 : 5).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-secondary/40 rounded transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Orders */}
          {matchingOrders.length > 0 && (
            <div>
              <p className="px-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Orders</p>
              <div className="space-y-0.5">
                {matchingOrders.map((o) => {
                  const cust = customers.find((c) => c.id === o.customerId);
                  return (
                    <button
                      key={o.id}
                      onClick={() => handleSelect('register', o.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-secondary/40 rounded transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{o.orderNumber}</span>
                          <Badge variant={o.status === 'POSTED' ? 'success' : 'destructive'} className="text-[10px] py-0">
                            {o.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{cust?.name} · {formatINR(o.totalOrderRevenue)}</p>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">View Order →</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reservations */}
          {matchingReservations.length > 0 && (
            <div>
              <p className="px-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Reservations</p>
              <div className="space-y-0.5">
                {matchingReservations.map((r) => {
                  const cust = customers.find((c) => c.id === r.customerId);
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleSelect('reservations', r.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-secondary/40 rounded transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{r.reservationNumber}</span>
                          <Badge variant={r.status === 'CONFIRMED' ? 'outline' : 'secondary'} className="text-[10px] py-0">
                            {r.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{cust?.name} · Due {r.promisedDeliveryDate}</p>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">Delivery Board →</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Boxes */}
          {matchingBoxes.length > 0 && (
            <div>
              <p className="px-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Box Designs</p>
              <div className="space-y-0.5">
                {matchingBoxes.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleSelect('calculator')}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-secondary/40 rounded transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <img src={b.imageUrl} alt={b.boxCode} className="w-7 h-7 object-contain bg-secondary/30 p-0.5 border" />
                      <div>
                        <span className="font-semibold">{b.boxCode}</span>
                        {b.boxName && <span className="text-xs text-muted-foreground ml-2">{b.boxName}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{formatINR(b.currentFinalRate)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Raw Materials */}
          {matchingMaterials.length > 0 && (
            <div>
              <p className="px-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Raw Materials / Dry Fruits</p>
              <div className="space-y-0.5">
                {matchingMaterials.map((rm) => (
                  <button
                    key={rm.id}
                    onClick={() => handleSelect('inventory')}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-secondary/40 rounded transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-semibold">{rm.displayName}</span>
                      {rm.variant && <span className="text-xs text-muted-foreground ml-2">({rm.variant})</span>}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{formatINR(rm.currentInternalSellingRate)}/{rm.unit}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customers */}
          {matchingCustomers.length > 0 && (
            <div>
              <p className="px-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Customers</p>
              <div className="space-y-0.5">
                {matchingCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelect('register')}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-secondary/40 rounded transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-semibold">{c.name}</span>
                      {c.companyName && <span className="text-xs text-muted-foreground ml-2">({c.companyName})</span>}
                      {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">View History →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suppliers */}
          {matchingSuppliers.length > 0 && (
            <div>
              <p className="px-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Suppliers</p>
              <div className="space-y-0.5">
                {matchingSuppliers.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelect('purchases')}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-secondary/40 rounded transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-semibold">{s.name}</span>
                      {s.phone && <p className="text-xs text-muted-foreground">{s.phone}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">Purchases →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {q && !hasResults && (
            <div className="py-8 text-center text-muted-foreground text-xs">
              No matching orders, boxes, customers, or items found for "{query}".
            </div>
          )}
        </div>

        <div className="px-4 py-2 bg-secondary/20 border-t border-foreground/10 flex justify-between items-center text-[11px] text-muted-foreground">
          <span>Navigate with <strong>↑</strong> <strong>↓</strong> or Click</span>
          <span>Shortcut: <strong>Ctrl + K</strong></span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function openOpenSafe(val: boolean) {
  return val;
}
