import React, { useState } from 'react';
import { useStore } from '@/services/storeContext';
import { Button } from '@/components/ui/button';
import { formatQty, formatDate } from '@/lib/utils';
import { ArrowLeft, Printer, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PackingSheetProps {
  selectedOrderId?: string;
  onBack?: () => void;
}

export const PackingSheetScreen: React.FC<PackingSheetProps> = ({ selectedOrderId, onBack }) => {
  const { orders, customers, boxes, rawMaterials } = useStore();
  const [search, setSearch] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState<string>(
    selectedOrderId || orders.find((o) => o.status === 'POSTED')?.id || ''
  );

  const active = orders.filter((o) => {
    if (o.status !== 'POSTED') return false;
    if (!search) return true;
    const cust = customers.find((c) => c.id === o.customerId);
    return `${o.orderNumber} ${cust?.name || ''} ${cust?.phone || ''}`.toLowerCase().includes(search.toLowerCase());
  });
  const order = orders.find((o) => o.id === currentOrderId) || active[0];
  const customer = customers.find((c) => c.id === order?.customerId);

  const agg: Record<string, { name: string; unit: 'KG' | 'PCS'; total: number }> = {};
  if (order) {
    for (const line of order.lines) {
      for (const item of line.items) {
        const rm = rawMaterials.find((r) => r.id === item.rawMaterialId);
        if (rm) {
          if (!agg[rm.id]) agg[rm.id] = { name: rm.displayName, unit: item.unit, total: 0 };
          agg[rm.id].total += item.totalRequiredQty;
        }
      }
    }
  }

  return (
    <div className="max-w-3xl space-y-10">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <h1 className="font-serif text-3xl font-bold">Packing sheet</h1>
            <p className="text-sm text-muted-foreground mt-1">Mobile & printable instructions.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-36 sm:w-48">
            <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Find order #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 text-xs h-7"
            />
          </div>
          <select value={currentOrderId} onChange={(e) => setCurrentOrderId(e.target.value)} className="bg-transparent border-b border-foreground/20 py-1 text-xs focus:outline-none max-w-[160px] truncate">
            {active.map((o) => (<option key={o.id} value={o.id}>{o.orderNumber} — {customers.find((c) => c.id === o.customerId)?.name}</option>))}
          </select>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="h-7 text-xs">
            <Printer className="h-3 w-3 mr-1" /> Print
          </Button>
        </div>
      </div>

      {!order ? (
        <p className="py-16 text-center text-muted-foreground">No active order selected.</p>
      ) : (
        <>
          {/* Order header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-foreground/10 pt-6">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Order</p>
              <p className="text-sm font-medium mt-1">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Customer</p>
              <p className="text-sm font-medium mt-1">{customer?.name}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Date</p>
              <p className="text-sm mt-1">{formatDate(order.billingDate)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Delivery</p>
              <p className="text-sm mt-1 truncate">{customer?.deliveryAddress || 'Self pickup'}</p>
            </div>
          </div>

          {/* Aggregated pull list */}
          {Object.keys(agg).length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Total raw materials to weigh</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px border border-foreground/10">
                {Object.entries(agg).map(([id, ing]) => (
                  <div key={id} className="bg-background p-4">
                    <p className="text-[11px] text-muted-foreground">{ing.name}</p>
                    <p className="text-lg font-serif font-bold mt-1">{formatQty(ing.total, ing.unit)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Line-by-line instructions */}
          <section className="space-y-6">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Pack instructions</h2>
            {order.lines.map((line) => {
              const box = boxes.find((b) => b.id === line.boxId);
              return (
                <div key={line.id} className="flex gap-6 border-t border-foreground/5 pt-6">
                  {line.saleType !== 'ITEMS_COMBO_NO_BOX' && box && (
                    <div className="w-20 h-20 aspect-square bg-secondary/30 p-1.5 shrink-0 overflow-hidden flex items-center justify-center">
                      <img src={box.imageUrl} alt={box.boxCode} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{box?.boxName || line.saleType.replace(/_/g, ' ')}</p>
                        {box && <p className="text-xs text-muted-foreground">{box.boxCode}</p>}
                      </div>
                      <span className="text-xs font-medium bg-foreground text-background px-2 py-0.5">
                        PACK {line.quantity}
                      </span>
                    </div>
                    {line.bagRequired && (
                      <p className="text-xs text-muted-foreground">Include {line.bagSize} gift bag × {line.quantity}</p>
                    )}
                    {line.items.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        {line.items.map((it) => {
                          const rm = rawMaterials.find((r) => r.id === it.rawMaterialId);
                          return (
                            <span key={it.id}>
                              <span className="text-muted-foreground">{rm?.displayName}:</span>{' '}
                              <span className="font-medium">{formatQty(it.actualPackingQty, it.unit)}</span>
                              <span className="text-muted-foreground"> per box</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
};
