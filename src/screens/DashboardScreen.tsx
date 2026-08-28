import React from 'react';
import { useStore } from '@/services/storeContext';
import { Button } from '@/components/ui/button';
import { formatINR, formatQty } from '@/lib/utils';
import { ArrowRight, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const DashboardScreen: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user, boxes, rawMaterials, orders, getItemBalance } = useStore();

  const activeOrders = orders.filter((o) => o.status === 'POSTED');
  const totalRevenue = activeOrders.reduce((sum, o) => sum + o.totalOrderRevenue, 0);
  const totalActualGP = activeOrders.reduce((sum, o) => sum + (o.costSnapshot?.actualGrossProfit || 0), 0);

  let boxesSold = 0;
  let comboSetsSold = 0;
  for (const o of activeOrders) {
    for (const l of o.lines) {
      if (l.saleType === 'ITEMS_COMBO_NO_BOX') {
        comboSetsSold += l.quantity;
      } else {
        boxesSold += l.quantity;
      }
    }
  }

  const lowStockBoxes = boxes.filter((b) => {
    const bal = getItemBalance(b.id, 'BOX');
    return bal.available <= 10;
  });

  return (
    <div className="space-y-16">
      {/* Hero */}
      <div className="pt-8">
        <h1 className="font-serif text-4xl sm:text-5xl font-bold leading-tight max-w-lg">
          Operations & inventory control
        </h1>
        <p className="mt-4 text-muted-foreground max-w-md">
          Welcome back, {user?.fullName || 'User'}. Signed in as <span className="font-semibold uppercase text-foreground">{user?.role || 'Guest'}</span>.
        </p>
        <div className="flex flex-wrap gap-3 mt-8">
          {user?.role !== 'viewer' && (
            <Button onClick={() => onNavigate('sales')}>
              New sale order <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          )}
          {user?.role !== 'viewer' ? (
            <Button variant="outline" onClick={() => onNavigate('calculator')}>
              Price calculator
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onNavigate('register')}>
              View Orders
            </Button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px border border-foreground/10">
        {[
          { label: 'Active orders', value: String(activeOrders.length) },
          { label: 'Boxes sold', value: String(boxesSold) },
          { label: 'Combo sets sold', value: String(comboSetsSold) },
          { label: 'Total revenue', value: formatINR(totalRevenue) },
          ...(user?.role === 'owner'
            ? [
                { label: 'Actual GP', value: formatINR(totalActualGP) },
                { label: 'GP margin', value: totalRevenue > 0 ? `${((totalActualGP / totalRevenue) * 100).toFixed(1)}%` : '—' },
              ]
            : []),
        ].map((metric) => (
          <div key={metric.label} className="bg-background p-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{metric.label}</p>
            <p className="text-2xl font-serif font-bold mt-2">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Low stock alert */}
      {lowStockBoxes.length > 0 && (
        <div className="flex items-start gap-3 border-l-2 border-foreground pl-4 py-1">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">{lowStockBoxes.length} box design(s) running low</p>
            <p className="text-sm text-muted-foreground mt-1">
              {lowStockBoxes.map((b) => `${b.boxCode} (${getItemBalance(b.id, 'BOX').available} left)`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Materials table */}
      {rawMaterials.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl font-semibold">Raw materials</h2>
            <button onClick={() => onNavigate('inventory')} className="text-sm text-muted-foreground hover:text-foreground">
              View all →
            </button>
          </div>
          <div className="border-t border-foreground/10">
            {rawMaterials.map((rm) => {
              const bal = getItemBalance(rm.id, 'RAW_MATERIAL');
              return (
                <div key={rm.id} className="flex items-center justify-between py-3.5 border-b border-foreground/5">
                  <div>
                    <span className="text-sm font-medium">{rm.displayName}</span>
                    {rm.variant && <span className="text-xs text-muted-foreground ml-2">{rm.variant}</span>}
                  </div>
                  <span className="text-sm tabular-nums">{formatQty(bal.available, rm.unit)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Boxes */}
      {boxes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl font-semibold">Box designs</h2>
            <button onClick={() => onNavigate('masters')} className="text-sm text-muted-foreground hover:text-foreground">
              Manage →
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px border border-foreground/10">
            {boxes.map((box) => {
              const bal = getItemBalance(box.id, 'BOX');
              return (
                <div key={box.id} className="bg-background">
                  <div className="aspect-square bg-secondary/30 p-3 overflow-hidden flex items-center justify-center">
                    <img src={box.imageUrl} alt={box.boxCode} className="h-full w-full object-contain" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{box.boxCode}</span>
                      <span className="text-xs text-muted-foreground">{bal.available} avail</span>
                    </div>
                    {box.boxName && <p className="text-xs text-muted-foreground mt-1 truncate">{box.boxName}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {boxes.length === 0 && rawMaterials.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No inventory data yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add box designs and raw materials from the{' '}
            <button onClick={() => onNavigate('masters')} className="underline text-foreground">Masters</button> section.
          </p>
        </div>
      )}
    </div>
  );
};
