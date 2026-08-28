import React, { useState } from 'react';
import { useStore } from '@/services/storeContext';
import { SaleType, OrderLineInput } from '@/types/sales';
import { GiftBagSize } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatINR, formatQty } from '@/lib/utils';
import { Plus, Trash2, ArrowRight, UserPlus, ShieldAlert } from 'lucide-react';

export const NewSaleScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { customers, boxes, rawMaterials, postDirectSale, addCustomer, getItemBalance, user } = useStore();

  if (user?.role === 'viewer') {
    return (
      <div className="max-w-2xl py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="font-serif text-2xl font-bold">Access Restricted</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Transaction posting is disabled in Viewer / Audit mode.
        </p>
      </div>
    );
  }

  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [custSearch, setCustSearch] = useState('');
  const [quickCustOpen, setQuickCustOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [billingDate, setBillingDate] = useState(new Date().toISOString().split('T')[0]);
  const [packagingRecovery, setPackagingRecovery] = useState(0);

  const filteredCustomers = customers.filter((c) => {
    if (!custSearch) return true;
    const q = custSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q) || c.companyName?.toLowerCase().includes(q);
  });

  const handleQuickAddCust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName) return alert('Name required');
    // Fix 5: Capture returned ID and auto-select the new customer
    const newId = await addCustomer({ name: newCustName, phone: newCustPhone, deliveryAddress: newCustAddress });
    setCustomerId(newId);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setQuickCustOpen(false);
  };
  const [lines, setLines] = useState<OrderLineInput[]>([
    {
      saleType: 'BOX_WITH_ITEMS',
      boxId: boxes[0]?.id,
      quantity: 1,
      sellingRatePerUnit: 1200,
      bagRequired: false,
      items: rawMaterials.length > 0
        ? [{ rawMaterialId: rawMaterials[0]?.id || '', actualPackingQty: 0.250, unit: 'KG' as const }]
        : [],
    },
  ]);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        saleType: 'BOX_WITH_ITEMS',
        boxId: boxes[0]?.id,
        quantity: 1,
        sellingRatePerUnit: 1000,
        bagRequired: false,
        items: rawMaterials.length > 0
          ? [{ rawMaterialId: rawMaterials[0]?.id || '', actualPackingQty: 0.250, unit: 'KG' as const }]
          : [],
      },
    ]);
  };

  const removeLine = (i: number) => setLines((p) => p.filter((_, idx) => idx !== i));

  const updateLine = (i: number, u: Partial<OrderLineInput>) =>
    setLines((p) => p.map((l, idx) => (idx === i ? { ...l, ...u } : l)));

  const addItem = (li: number) => {
    setLines((p) =>
      p.map((l, i) =>
        i === li
          ? { ...l, items: [...l.items, { rawMaterialId: rawMaterials[0]?.id || '', actualPackingQty: 0.250, unit: 'KG' as const }] }
          : l
      )
    );
  };

  const removeItem = (li: number, ii: number) => {
    setLines((p) =>
      p.map((l, i) => (i === li ? { ...l, items: l.items.filter((_, idx) => idx !== ii) } : l))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return alert('Select a customer');
    postDirectSale({ customerId, billingDate, isTaxInclusive: false, lines, packagingRecovery: Number(packagingRecovery) || 0 });
    onComplete();
  };

  const total = lines.reduce((s, l) => s + (l.sellingRatePerUnit || 0) * (l.quantity || 1), 0) + (Number(packagingRecovery) || 0);

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-12">
      <div>
        <h1 className="font-serif text-3xl font-bold">New sale order</h1>
        <p className="text-muted-foreground mt-2 text-sm">Atomic stock deduction on confirmation.</p>
      </div>

      {/* Header fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground block">Customer</label>
            <Dialog open={quickCustOpen} onOpenChange={setQuickCustOpen}>
              <DialogTrigger asChild>
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <UserPlus className="h-3 w-3" /> New
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Quick add customer</DialogTitle></DialogHeader>
                <form onSubmit={handleQuickAddCust} className="space-y-4 mt-4">
                  <Input placeholder="Customer name *" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} />
                  <Input placeholder="Phone number" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} />
                  <Input placeholder="Delivery address" value={newCustAddress} onChange={(e) => setNewCustAddress(e.target.value)} />
                  <Button type="submit" className="w-full">Create customer</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-1.5">
            <Input
              placeholder="Type to filter customer..."
              value={custSearch}
              onChange={(e) => setCustSearch(e.target.value)}
              className="text-xs h-7 mb-1"
            />
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-transparent border-b border-foreground/20 py-1.5 text-sm focus:border-foreground focus:outline-none"
            >
              {filteredCustomers.length === 0 && <option value="">No matching customers</option>}
              {filteredCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.phone ? ` (${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">Billing date</label>
          <Input type="date" value={billingDate} onChange={(e) => setBillingDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">Packaging recovery ₹</label>
          <Input type="number" placeholder="0" value={packagingRecovery || ''} onChange={(e) => setPackagingRecovery(Number(e.target.value))} />
        </div>
      </div>

      {/* Lines */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold">Line items</h2>
        </div>

        {lines.map((line, li) => (
          <div key={li} className="border-t border-foreground/10 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Line {li + 1}</p>
              {lines.length > 1 && (
                <button type="button" onClick={() => removeLine(li)} className="text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Sale type</label>
                <select value={line.saleType} onChange={(e) => updateLine(li, { saleType: e.target.value as SaleType })} className="w-full bg-transparent border-b border-foreground/20 py-1.5 text-sm focus:outline-none">
                  <option value="BOX_WITH_ITEMS">Box + Items</option>
                  <option value="BOX_ONLY">Box only</option>
                  <option value="ITEMS_COMBO_NO_BOX">Items only</option>
                </select>
              </div>

              {line.saleType !== 'ITEMS_COMBO_NO_BOX' && (
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">Box</label>
                  <select value={line.boxId} onChange={(e) => updateLine(li, { boxId: e.target.value })} className="w-full bg-transparent border-b border-foreground/20 py-1.5 text-sm focus:outline-none">
                    {boxes.map((b) => (<option key={b.id} value={b.id}>{b.boxCode} ({getItemBalance(b.id, 'BOX').available})</option>))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Quantity</label>
                <Input type="number" min="1" value={line.quantity} onChange={(e) => updateLine(li, { quantity: Math.max(1, parseInt(e.target.value) || 1) })} />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Rate per unit ₹</label>
                <Input type="number" value={line.sellingRatePerUnit} onChange={(e) => updateLine(li, { sellingRatePerUnit: Number(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={line.bagRequired} onChange={(e) => updateLine(li, { bagRequired: e.target.checked })} className="accent-foreground" />
                Gift bag
              </label>
              {line.bagRequired && (
                <select value={line.bagSize} onChange={(e) => updateLine(li, { bagSize: e.target.value as GiftBagSize })} className="bg-transparent border-b border-foreground/20 py-1 text-sm focus:outline-none">
                  <option value="SMALL">Small</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LARGE">Large</option>
                </select>
              )}
            </div>

            {line.saleType !== 'BOX_ONLY' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Ingredients per box</p>
                  <button type="button" onClick={() => addItem(li)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
                {line.items.map((item, ii) => (
                  <div key={ii} className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <select value={item.rawMaterialId} onChange={(e) => { const v = e.target.value; setLines((p) => p.map((l, i) => i === li ? { ...l, items: l.items.map((it, idx) => idx === ii ? { ...it, rawMaterialId: v } : it) } : l)); }} className="flex-1 min-w-0 bg-transparent border-b border-foreground/20 py-1.5 text-sm focus:outline-none truncate">
                      {rawMaterials.map((r) => (<option key={r.id} value={r.id}>{r.displayName} ({formatQty(getItemBalance(r.id, 'RAW_MATERIAL').available, r.unit)})</option>))}
                    </select>
                    <Input type="number" step="0.001" value={item.actualPackingQty} onChange={(e) => { const v = parseFloat(e.target.value) || 0; setLines((p) => p.map((l, i) => i === li ? { ...l, items: l.items.map((it, idx) => idx === ii ? { ...it, actualPackingQty: v } : it) } : l)); }} className="w-20 sm:w-24 shrink-0 text-right" />
                    <span className="text-xs text-muted-foreground shrink-0">{item.unit}</span>
                    {line.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(li, ii)} className="text-muted-foreground hover:text-foreground shrink-0 p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <button type="button" onClick={addLine} className="w-full border border-dashed border-foreground/20 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors">
          + Add another line
        </button>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between border-t border-foreground/10 pt-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total</p>
          <p className="text-2xl font-serif font-bold mt-1">{formatINR(total)}</p>
        </div>
        <Button type="submit" size="lg">
          Confirm & post <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};
