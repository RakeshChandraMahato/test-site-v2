import React, { useState } from 'react';
import { useStore } from '@/services/storeContext';
import { Input } from '@/components/ui/input';
import { formatINR } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';
import { GiftBagSize } from '@/types/models';

export const PriceCalculatorScreen: React.FC = () => {
  const { boxes, rawMaterials, giftBags, user } = useStore();
  const canSeeInternalCosts = user?.role === 'owner' || user?.role === 'manager';

  const [boxId, setBoxId] = useState(boxes[0]?.id || '');
  const [markup, setMarkup] = useState(25);
  const [bagReq, setBagReq] = useState(false);
  const [bagSize, setBagSize] = useState<GiftBagSize>('MEDIUM');
  const [items, setItems] = useState<{ rmId: string; qty: number }[]>(
    rawMaterials.length > 0 ? [{ rmId: rawMaterials[0]?.id, qty: 0.250 }] : []
  );

  const box = boxes.find((b) => b.id === boxId);
  const boxCost = box?.currentFinalRate || 0;
  const bagCost = bagReq ? (giftBags.find((b) => b.size === bagSize)?.costRate || 0) : 0;
  let rmCost = 0;
  for (const it of items) {
    const rm = rawMaterials.find((r) => r.id === it.rmId);
    if (rm) rmCost += (it.qty || 0) * rm.currentInternalSellingRate;
  }
  const base = boxCost + rmCost + bagCost;
  const recommended = base * (1 + markup / 100);

  return (
    <div className="max-w-2xl space-y-12">
      <div>
        <h1 className="font-serif text-3xl font-bold">Price calculator</h1>
        <p className="text-sm text-muted-foreground mt-2">Non-posting quotation tool for dry-fruit gift boxes.</p>
      </div>

      {/* Box select */}
      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Box design</h2>
        {boxes.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-1 border border-foreground/10">
            {boxes.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBoxId(b.id)}
                className={`p-2 border text-center transition-all cursor-pointer gpu-tap ${
                  boxId === b.id
                    ? 'border-foreground bg-secondary/30 shadow-sm'
                    : 'border-transparent hover:border-foreground/20'
                }`}
              >
                <div className="w-full aspect-square bg-secondary/20 p-1 mb-1.5 overflow-hidden flex items-center justify-center">
                  <img
                    src={b.imageUrl}
                    alt={b.boxCode}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-xs font-medium block truncate">{b.boxCode}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No boxes found.</p>
        )}
      </section>

      {/* Ingredients */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Dry-fruit ingredients</h2>
          <button
            type="button"
            onClick={() =>
              setItems((p) => [
                ...p,
                { rmId: rawMaterials[0]?.id || '', qty: 0.250 },
              ])
            }
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-3 w-3" /> Add item
          </button>
        </div>

        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <select
                value={item.rmId}
                onChange={(e) => {
                  const val = e.target.value;
                  setItems((p) =>
                    p.map((it, idx) => (idx === i ? { ...it, rmId: val } : it))
                  );
                }}
                className="flex-1 bg-transparent border-b border-foreground/20 py-1.5 text-sm focus:outline-none"
              >
                {rawMaterials.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.displayName}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                step="0.001"
                value={item.qty}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setItems((p) =>
                    p.map((it, idx) => (idx === i ? { ...it, qty: val } : it))
                  );
                }}
                className="w-24 text-right"
              />
              <span className="text-xs text-muted-foreground w-8">KG</span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Gift bag */}
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={bagReq} onChange={(e) => setBagReq(e.target.checked)} className="accent-foreground" />
        Include gift bag
        {bagReq && (
          <select value={bagSize} onChange={(e) => setBagSize(e.target.value as GiftBagSize)} className="ml-2 bg-transparent border-b border-foreground/20 py-1 text-sm focus:outline-none">
            <option value="SMALL">Small</option>
            <option value="MEDIUM">Medium</option>
            <option value="LARGE">Large</option>
          </select>
        )}
      </label>

      {/* Markup Slider - Only for Owner/Manager */}
      {canSeeInternalCosts && (
        <section className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Target Markup</span>
            <span className="font-medium">{markup}%</span>
          </div>
          <input type="range" min="0" max="100" value={markup} onChange={(e) => setMarkup(parseInt(e.target.value))} className="w-full accent-foreground cursor-pointer" />
        </section>
      )}

      {/* Result */}
      <div className="border-t border-foreground/10 pt-6 space-y-3">
        {canSeeInternalCosts && (
          <>
            {[
              { label: 'Box rate', value: formatINR(boxCost) },
              { label: 'Materials', value: formatINR(rmCost) },
              { label: 'Gift bag', value: formatINR(bagCost) },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="tabular-nums">{row.value}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-medium pt-3 border-t border-foreground/10">
              <span>Base cost</span>
              <span className="tabular-nums">{formatINR(base)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between items-end pt-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground block">Recommended Selling Price</span>
            <span className="text-xs text-muted-foreground">Calculated per box/set</span>
          </div>
          <span className="text-3xl font-serif font-bold tabular-nums">{formatINR(recommended)}</span>
        </div>
      </div>
    </div>
  );
};
