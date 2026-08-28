import React, { useState } from 'react';
import { useStore } from '@/services/storeContext';
import { formatINR } from '@/lib/utils';
import { ShieldAlert, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export const ProfitDashboardScreen: React.FC = () => {
  const { orders, customers, overheads, movements, boxes, rawMaterials, addOverhead, user } = useStore();
  const [overheadOpen, setOverheadOpen] = useState(false);
  const [periodMonth, setPeriodMonth] = useState(new Date().toISOString().slice(0, 7));
  const [category, setCategory] = useState('Godown Rent');
  const [amount, setAmount] = useState(15000);
  const [remarks, setRemarks] = useState('');

  if (user?.role !== 'owner') {
    return (
      <div className="max-w-2xl py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="font-serif text-2xl font-bold">Access Restricted</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Financial profitability, Actual Gross Profit, and overhead dashboards are confidential and accessible only to the <strong>Owner / Super Admin</strong> role.
        </p>
        <p className="text-xs text-muted-foreground">
          Current signed-in role: <span className="uppercase font-semibold text-foreground">{user?.role || 'Guest'}</span>
        </p>
      </div>
    );
  }

  const posted = orders.filter((o) => o.status === 'POSTED');
  const totalRevenue = posted.reduce((s, o) => s + o.totalOrderRevenue, 0);
  const totalActualGP = posted.reduce((s, o) => s + (o.costSnapshot?.actualGrossProfit || 0), 0);
  const avgMargin = totalRevenue > 0 ? (totalActualGP / totalRevenue) * 100 : 0;

  // Overheads and Stock-Out Expenses
  const totalFixedOverhead = overheads.reduce((s, ov) => s + ov.amount, 0);

  const expenseMovements = movements.filter(
    (m) => m.movementType === 'DAMAGE_UNREPAIRABLE' || m.movementType === 'SAMPLE_OR_HOME_OUT'
  );
  const totalStockOutLoss = expenseMovements.reduce((s, m) => {
    let rate = 0;
    if (m.itemType === 'BOX') {
      rate = boxes.find((b) => b.id === m.itemId)?.currentLandedCost || 0;
    } else {
      rate = rawMaterials.find((r) => r.id === m.itemId)?.currentLandedPurchaseRate || 0;
    }
    return s + Math.abs(m.physicalQtyDelta) * rate;
  }, 0);

  const netOperatingProfit = totalActualGP - totalFixedOverhead - totalStockOutLoss;
  const netMargin = totalRevenue > 0 ? (netOperatingProfit / totalRevenue) * 100 : 0;

  const handleAddOverhead = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return alert('Amount must be positive');
    addOverhead({
      periodMonth,
      category,
      amount,
      remarks,
    });
    setOverheadOpen(false);
  };

  let boxesSold = 0;
  let comboSetsSold = 0;
  let packagingIncurred = 0;
  let packagingRecovered = 0;
  let totalCommercialGP = 0;

  for (const o of posted) {
    totalCommercialGP += o.costSnapshot?.commercialGrossProfit || 0;
    packagingRecovered += o.packagingRecoveryAmount || 0;
    for (const l of o.lines) {
      if (l.saleType === 'ITEMS_COMBO_NO_BOX') {
        comboSetsSold += l.quantity;
      } else {
        boxesSold += l.quantity;
      }
      if (l.bagRequired && l.appliedBagCost) {
        packagingIncurred += l.appliedBagCost * l.quantity;
      }
    }
  }

  const netPackagingBurden = packagingIncurred - packagingRecovered;

  return (
    <div className="max-w-5xl space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Executive Financials & Net Profit</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Realized Gross Profit, Commercial GP, Fixed Overheads, and Net Bottom Line.
          </p>
        </div>
        <Dialog open={overheadOpen} onOpenChange={setOverheadOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Record Fixed Overhead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Fixed Overhead Expense</DialogTitle></DialogHeader>
            <form onSubmit={handleAddOverhead} className="space-y-4 mt-4">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Period Month</label>
                <Input type="month" value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} required />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Expense Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none">
                  <option value="Godown Rent">Godown Rent & Warehousing</option>
                  <option value="Staff Salaries">Staff Salaries & Labor</option>
                  <option value="Electricity & Power">Electricity & Utilities</option>
                  <option value="Software & Admin">Software, POS & Accounting</option>
                  <option value="Marketing & Travel">Marketing & Travel</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Expense Amount (₹)</label>
                <Input type="number" min="1" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} required />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Remarks</label>
                <Input placeholder="August godown rental payment" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">Log Overhead Expense</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px border border-foreground/10">
        {[
          { label: 'Total Revenue', value: formatINR(totalRevenue), note: `${posted.length} orders` },
          { label: 'Boxes Sold', value: String(boxesSold), note: `${comboSetsSold} combo sets sold` },
          { label: 'Actual Gross Profit', value: formatINR(totalActualGP), note: `${avgMargin.toFixed(1)}% GP margin` },
          { label: 'Commercial GP', value: formatINR(totalCommercialGP), note: 'Internal pricing basis' },
          { label: 'Fixed Overheads', value: formatINR(totalFixedOverhead), note: `${overheads.length} recorded` },
          { label: 'Stock-out / Loss', value: formatINR(totalStockOutLoss), note: 'Damage & personal use' },
          { label: 'Packaging Burden', value: formatINR(netPackagingBurden), note: `Incurred ${formatINR(packagingIncurred)} - Rec ${formatINR(packagingRecovered)}` },
          { label: 'Net Bottom Line', value: formatINR(netOperatingProfit), note: `${netMargin.toFixed(1)}% Net margin`, highlight: true },
        ].map((m) => (
          <div key={m.label} className={`p-6 ${m.highlight ? 'bg-secondary/40 border-l-2 border-foreground' : 'bg-background'}`}>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{m.label}</p>
            <p className="text-2xl font-serif font-bold mt-2">{m.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.note}</p>
          </div>
        ))}
      </div>

      {/* Customer profit table */}
      {posted.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Profit by customer</h2>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 touch-scroll">
            <table className="w-full text-left text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-foreground/10 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 font-medium">Customer</th>
                  <th className="py-3 font-medium text-right">Orders</th>
                  <th className="py-3 font-medium text-right">Revenue</th>
                  <th className="py-3 font-medium text-right">Actual GP</th>
                  <th className="py-3 font-medium text-right">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const byCust: Record<string, { count: number; rev: number; gp: number }> = {};
                  for (const o of posted) {
                    if (!byCust[o.customerId]) byCust[o.customerId] = { count: 0, rev: 0, gp: 0 };
                    byCust[o.customerId].count++;
                    byCust[o.customerId].rev += o.totalOrderRevenue;
                    byCust[o.customerId].gp += o.costSnapshot?.actualGrossProfit || 0;
                  }
                  return Object.entries(byCust)
                    .sort((a, b) => b[1].rev - a[1].rev)
                    .map(([cId, d]) => {
                      const cust = customers.find((c) => c.id === cId);
                      return (
                        <tr key={cId} className="border-b border-foreground/5">
                          <td className="py-3 font-medium">{cust?.name || 'Unknown'}</td>
                          <td className="py-3 text-right tabular-nums">{d.count}</td>
                          <td className="py-3 text-right tabular-nums">{formatINR(d.rev)}</td>
                          <td className="py-3 text-right tabular-nums">{formatINR(d.gp)}</td>
                          <td className="py-3 text-right tabular-nums">{d.rev > 0 ? `${((d.gp / d.rev) * 100).toFixed(1)}%` : '—'}</td>
                        </tr>
                      );
                    });
                })()}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Order detail */}
      {posted.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Order-level detail</h2>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 touch-scroll">
            <table className="w-full text-left text-sm min-w-[540px]">
              <thead>
                <tr className="border-b border-foreground/10 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 font-medium">Order</th>
                  <th className="py-3 font-medium">Customer</th>
                  <th className="py-3 font-medium text-right">Revenue</th>
                  <th className="py-3 font-medium text-right">Actual GP</th>
                  <th className="py-3 font-medium text-right">Commercial GP</th>
                  <th className="py-3 font-medium text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {posted.map((o) => {
                  const cust = customers.find((c) => c.id === o.customerId);
                  const cs = o.costSnapshot;
                  return (
                    <tr key={o.id} className="border-b border-foreground/5">
                      <td className="py-3 font-medium">{o.orderNumber}</td>
                      <td className="py-3 text-muted-foreground">{cust?.name}</td>
                      <td className="py-3 text-right tabular-nums">{formatINR(o.totalOrderRevenue)}</td>
                      <td className="py-3 text-right tabular-nums">{formatINR(cs?.actualGrossProfit || 0)}</td>
                      <td className="py-3 text-right tabular-nums text-muted-foreground">{formatINR(cs?.commercialGrossProfit || 0)}</td>
                      <td className="py-3 text-right tabular-nums">{cs ? `${cs.actualGrossMarginPct.toFixed(1)}%` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {posted.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">No posted orders to analyze.</p>
      )}
    </div>
  );
};
