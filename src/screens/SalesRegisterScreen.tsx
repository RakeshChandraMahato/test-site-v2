import React, { useState } from 'react';
import { useStore } from '@/services/storeContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatINR, formatDate, formatQty } from '@/lib/utils';
import { ChevronDown, ChevronRight, Search, Printer, X } from 'lucide-react';

export const SalesRegisterScreen: React.FC<{
  onOpenPacking: (orderId: string) => void;
  initialOrderId?: string;
}> = ({ onOpenPacking, initialOrderId }) => {
  const { orders, customers, boxes, cancelSale, user } = useStore();
  const [search, setSearch] = useState(initialOrderId ? '' : '');
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    initialOrderId ? { [initialOrderId]: true } : {}
  );

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const filtered = orders.filter((o) => {
    if (initialOrderId && o.id === initialOrderId) return true;
    const c = customers.find((c) => c.id === o.customerId);
    const boxCodes = o.lines.map((l) => boxes.find((b) => b.id === l.boxId)?.boxCode || '').join(' ');
    const searchTarget = `${o.orderNumber} ${c?.name || ''} ${c?.phone || ''} ${c?.companyName || ''} ${boxCodes}`.toLowerCase();
    return searchTarget.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Sales register</h1>
          <p className="text-sm text-muted-foreground mt-2">Searchable orders with rate snapshots and cancellation audit.</p>
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-0 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-5" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No orders found.</p>
      ) : (
        <div className="border-t border-foreground/10">
          {filtered.map((order) => {
            const customer = customers.find((c) => c.id === order.customerId);
            const isOpen = !!expanded[order.id];
            return (
              <div key={order.id} className={`border-b border-foreground/5 ${order.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-4 py-4 cursor-pointer" onClick={() => toggle(order.id)}>
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{order.orderNumber}</span>
                      <Badge variant={order.status === 'POSTED' ? 'success' : 'destructive'}>{order.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {customer?.name} · {formatDate(order.billingDate)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium tabular-nums">{formatINR(order.totalOrderRevenue)}</p>
                    {user?.role === 'owner' && order.costSnapshot && (
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        GP {formatINR(order.costSnapshot.actualGrossProfit)} ({order.costSnapshot.actualGrossMarginPct.toFixed(1)}%)
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" title="View / Print Packing Sheet" onClick={(e) => { e.stopPropagation(); onOpenPacking(order.id); }}>
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                    {order.status === 'POSTED' && user?.role !== 'viewer' && (
                      <Button variant="ghost" size="icon" title="Cancel Sale" onClick={(e) => { e.stopPropagation(); const r = prompt('Cancellation reason:'); if (r) cancelSale(order.id, r); }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="pb-4 pl-8 space-y-3">
                    {order.cancelReason && (
                      <p className="text-xs text-destructive">Cancelled: {order.cancelReason}</p>
                    )}
                    {order.lines.map((line, i) => (
                      <div key={line.id} className="text-xs space-y-1">
                        <p className="font-medium">
                          Line {i + 1}: {line.saleType.replace(/_/g, ' ')} × {line.quantity} — {formatINR(line.lineTaxableRevenue)}
                        </p>
                        {line.items.length > 0 && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                            {line.items.map((it) => (
                              <span key={it.id}>{formatQty(it.actualPackingQty, it.unit)} per unit · {formatQty(it.totalRequiredQty, it.unit)} total</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
