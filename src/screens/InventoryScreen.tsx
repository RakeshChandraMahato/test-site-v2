import React, { useState } from 'react';
import { useStore } from '@/services/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatQty } from '@/lib/utils';
import { ArrowRightLeft, AlertOctagon, Wrench, Search } from 'lucide-react';

export const InventoryScreen: React.FC = () => {
  const { boxes, rawMaterials, godowns, getItemBalance, postTransfer, postDamage, repairDamage, user } = useStore();
  const [tab, setTab] = useState<'boxes' | 'materials'>('boxes');
  const [search, setSearch] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [damageOpen, setDamageOpen] = useState(false);
  const [repairOpen, setRepairOpen] = useState(false);

  // Transfer State
  const [tItem, setTItem] = useState({ type: 'BOX' as const, id: boxes[0]?.id || '' });
  const [tQty, setTQty] = useState(1);
  const [tSrc, setTSrc] = useState(godowns[0]?.id || '');
  const [tDest, setTDest] = useState(godowns[1]?.id || '');

  // Damage State
  const [dItem, setDItem] = useState({ type: 'BOX' as const, id: boxes[0]?.id || '' });
  const [dQty, setDQty] = useState(1);
  const [dRepairable, setDRepairable] = useState(true);
  const [dRemarks, setDRemarks] = useState('');

  // Repair State
  const [rItem, setRItem] = useState({ type: 'BOX' as const, id: boxes[0]?.id || '' });
  const [rQty, setRQty] = useState(1);
  const [rRemarks, setRRemarks] = useState('');

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-2">Real-time balances from immutable ledger.</p>
        </div>
        {user?.role !== 'viewer' && (
          <div className="flex flex-wrap gap-2">
            {/* Transfer Dialog */}
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" /> Transfer</Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Godown transfer</DialogTitle></DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (tSrc === tDest) return alert('Different godowns required');
                  postTransfer(tItem.type, tItem.id, tSrc, tDest, tQty);
                  setTransferOpen(false);
                }}
                className="space-y-4 mt-4"
              >
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Item</label>
                  <select
                    value={`${tItem.type}:${tItem.id}`}
                    onChange={(e) => {
                      const [t, i] = e.target.value.split(':');
                      setTItem({ type: t as any, id: i });
                    }}
                    className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none"
                  >
                    {boxes.map((b) => <option key={b.id} value={`BOX:${b.id}`}>Box: {b.boxCode}</option>)}
                    {rawMaterials.map((r) => <option key={r.id} value={`RAW_MATERIAL:${r.id}`}>{r.displayName}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">From</label>
                    <select value={tSrc} onChange={(e) => setTSrc(e.target.value)} className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none">
                      {godowns.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">To</label>
                    <select value={tDest} onChange={(e) => setTDest(e.target.value)} className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none">
                      {godowns.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Quantity</label>
                  <Input type="number" step="0.001" value={tQty} onChange={(e) => setTQty(parseFloat(e.target.value) || 1)} />
                </div>
                <Button type="submit" className="w-full">Confirm transfer</Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Damage Dialog */}
          <Dialog open={damageOpen} onOpenChange={setDamageOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><AlertOctagon className="h-3.5 w-3.5 mr-1.5" /> Log damage</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record damaged stock</DialogTitle></DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  postDamage(dItem.type, dItem.id, godowns[0]?.id || '', dQty, dRepairable, 0, dRemarks || 'Damage');
                  setDamageOpen(false);
                }}
                className="space-y-4 mt-4"
              >
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Item</label>
                  <select
                    value={`${dItem.type}:${dItem.id}`}
                    onChange={(e) => {
                      const [t, i] = e.target.value.split(':');
                      setDItem({ type: t as any, id: i });
                    }}
                    className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none"
                  >
                    {boxes.map((b) => <option key={b.id} value={`BOX:${b.id}`}>Box: {b.boxCode}</option>)}
                    {rawMaterials.map((r) => <option key={r.id} value={`RAW_MATERIAL:${r.id}`}>{r.displayName}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Qty</label>
                    <Input type="number" min="1" value={dQty} onChange={(e) => setDQty(parseInt(e.target.value) || 1)} />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Repairable?</label>
                    <select value={dRepairable ? 'yes' : 'no'} onChange={(e) => setDRepairable(e.target.value === 'yes')} className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none">
                      <option value="yes">Yes — Hold for repair</option>
                      <option value="no">No — Write off loss</option>
                    </select>
                  </div>
                </div>
                <Input placeholder="Reason / Remarks" value={dRemarks} onChange={(e) => setDRemarks(e.target.value)} />
                <Button type="submit" className="w-full">Log damage</Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Repair Dialog */}
          <Dialog open={repairOpen} onOpenChange={setRepairOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Wrench className="h-3.5 w-3.5 mr-1.5" /> Restore repair</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Restore repaired stock to saleable</DialogTitle></DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  repairDamage(rItem.type, rItem.id, godowns[0]?.id || '', rQty, rRemarks || 'Repaired & restored');
                  setRepairOpen(false);
                }}
                className="space-y-4 mt-4"
              >
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Item to restore</label>
                  <select
                    value={`${rItem.type}:${rItem.id}`}
                    onChange={(e) => {
                      const [t, i] = e.target.value.split(':');
                      setRItem({ type: t as any, id: i });
                    }}
                    className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none"
                  >
                    {boxes.map((b) => <option key={b.id} value={`BOX:${b.id}`}>Box: {b.boxCode} ({getItemBalance(b.id, 'BOX').repairHold} on hold)</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Repaired quantity</label>
                  <Input type="number" min="1" value={rQty} onChange={(e) => setRQty(parseInt(e.target.value) || 1)} />
                </div>
                <Input placeholder="Repair notes" value={rRemarks} onChange={(e) => setRRemarks(e.target.value)} />
                <Button type="submit" className="w-full">Restore to saleable</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        )}
      </div>

      {/* Tab switch & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-foreground/10 pb-1">
        <div className="flex gap-0">
          {(['boxes', 'materials'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setSearch('');
              }}
              className={`px-4 py-2.5 text-sm border-b-2 -mb-1 transition-colors ${
                tab === t
                  ? 'border-foreground text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'boxes' ? `Boxes (${boxes.length})` : `Raw materials (${rawMaterials.length})`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={`Search ${tab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 touch-scroll">
        <table className="w-full text-left text-sm min-w-[520px]">
          <thead>
            <tr className="border-b border-foreground/10 text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-3 font-medium">Item</th>
              <th className="py-3 font-medium text-right">Saleable</th>
              <th className="py-3 font-medium text-right">Repair hold</th>
              <th className="py-3 font-medium text-right">Reserved</th>
              <th className="py-3 font-medium text-right">Available</th>
            </tr>
          </thead>
          <tbody>
            {tab === 'boxes'
              ? boxes
                  .filter((b) => !search || b.boxCode.toLowerCase().includes(search.toLowerCase()) || b.boxName?.toLowerCase().includes(search.toLowerCase()))
                  .map((b) => {
                    const bal = getItemBalance(b.id, 'BOX');
                    return (
                      <tr key={b.id} className="border-b border-foreground/5">
                        <td className="py-3 flex items-center gap-3">
                          <div className="w-10 h-10 aspect-square bg-secondary/30 p-1 overflow-hidden shrink-0 flex items-center justify-center">
                            <img src={b.imageUrl} alt={b.boxCode} className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <span className="font-medium">{b.boxCode}</span>
                            {b.boxName && <p className="text-xs text-muted-foreground">{b.boxName}</p>}
                          </div>
                        </td>
                        <td className="py-3 text-right tabular-nums font-mono">{bal.saleable}</td>
                        <td className="py-3 text-right tabular-nums font-mono text-muted-foreground">{bal.repairHold}</td>
                        <td className="py-3 text-right tabular-nums font-mono text-muted-foreground">{bal.reserved}</td>
                        <td className="py-3 text-right tabular-nums font-mono font-semibold">{bal.available}</td>
                      </tr>
                    );
                  })
              : rawMaterials
                  .filter((r) => !search || r.displayName.toLowerCase().includes(search.toLowerCase()) || r.variant?.toLowerCase().includes(search.toLowerCase()))
                  .map((r) => {
                    const bal = getItemBalance(r.id, 'RAW_MATERIAL');
                    return (
                      <tr key={r.id} className="border-b border-foreground/5">
                        <td className="py-3">
                          <span className="font-medium">{r.displayName}</span>
                          {r.variant && <span className="text-xs text-muted-foreground ml-2">{r.variant}</span>}
                        </td>
                        <td className="py-3 text-right tabular-nums font-mono">{formatQty(bal.saleable, r.unit)}</td>
                        <td className="py-3 text-right tabular-nums font-mono text-muted-foreground">{formatQty(bal.repairHold, r.unit)}</td>
                        <td className="py-3 text-right tabular-nums font-mono text-muted-foreground">{formatQty(bal.reserved, r.unit)}</td>
                        <td className="py-3 text-right tabular-nums font-mono font-semibold">{formatQty(bal.available, r.unit)}</td>
                      </tr>
                    );
                  })}
            {((tab === 'boxes' && boxes.length === 0) || (tab === 'materials' && rawMaterials.length === 0)) && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  No items recorded in inventory.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
