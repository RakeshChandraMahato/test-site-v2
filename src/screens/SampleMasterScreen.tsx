import React, { useState } from 'react';
import { useStore } from '@/services/storeContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, ShoppingCart, Gift } from 'lucide-react';

export const SampleMasterScreen: React.FC = () => {
  const { samples, boxes, rawMaterials, customers, createSample, deleteSample, transferSampleToSale, issueSampleFreeOrHome, user } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [sampleCode, setSampleCode] = useState('');
  const [sampleName, setSampleName] = useState('');
  const [boxId, setBoxId] = useState(boxes[0]?.id || '');
  const [bagRequired, setBagRequired] = useState(false);
  const [bagSize, setBagSize] = useState<'SMALL' | 'MEDIUM' | 'LARGE'>('MEDIUM');
  const [unitsMade, setUnitsMade] = useState(1);
  const [manualMrp, setManualMrp] = useState(0);
  const [items, setItems] = useState<{ rawMaterialId: string; actualPackingQty: number; unit: 'KG' | 'PCS' }[]>(
    rawMaterials.length > 0 ? [{ rawMaterialId: rawMaterials[0]?.id, actualPackingQty: 0.250, unit: 'KG' }] : []
  );
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Transfer & Issue Modals
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  const [sellUnits, setSellUnits] = useState(1);
  const [sellCustomerId, setSellCustomerId] = useState(customers[0]?.id || '');
  const [sellRate, setSellRate] = useState(500);

  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueUnits, setIssueUnits] = useState(1);
  const [issueReason, setIssueReason] = useState('Promotional gift to client');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleCode || !sampleName) return alert('Code and name are required');
    createSample({
      sampleCode,
      sampleName,
      boxId: boxId || undefined,
      bagRequired,
      bagSize: bagRequired ? bagSize : undefined,
      unitsMade,
      manualMrp: manualMrp || undefined,
      status: 'ACTIVE',
      items,
    });
    setSampleCode(''); setSampleName(''); setUnitsMade(1); setManualMrp(0);
    setAddOpen(false);
  };

  const handleSellSample = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSample) return;
    transferSampleToSale(selectedSample.id, sellUnits, sellCustomerId, sellRate);
    setSaleModalOpen(false);
    alert(`Successfully transferred ${sellUnits} sample unit(s) to a live customer Sales Order!`);
  };

  const handleIssueSample = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSample) return;
    issueSampleFreeOrHome(selectedSample.id, issueUnits, issueReason);
    setIssueModalOpen(false);
    alert(`Logged ${issueUnits} sample unit(s) to operating stock-out expenses.`);
  };

  const filtered = filter === 'ALL' ? samples : samples.filter((s) => s.status === filter);

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Sample Recipes & Master</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Standard box configurations, sample batch inventory tracking, and sales conversions.
          </p>
        </div>
        {user?.role !== 'viewer' && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" /> New Recipe</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Sample Recipe</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Code</label>
                    <Input placeholder="SMP-001" value={sampleCode} onChange={(e) => setSampleCode(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Name</label>
                    <Input placeholder="Festive Royale Quad" value={sampleName} onChange={(e) => setSampleName(e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Box Design</label>
                    <select value={boxId} onChange={(e) => setBoxId(e.target.value)} className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none">
                      <option value="">No Box (Loose Combo)</option>
                      {boxes.map((b) => <option key={b.id} value={b.id}>{b.boxCode}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Units Made (Batch Size)</label>
                    <Input type="number" min="1" value={unitsMade} onChange={(e) => setUnitsMade(parseInt(e.target.value) || 1)} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Quoted MRP (₹)</label>
                    <Input type="number" value={manualMrp} onChange={(e) => setManualMrp(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input type="checkbox" checked={bagRequired} onChange={(e) => setBagRequired(e.target.checked)} className="accent-foreground" />
                    <span className="text-sm">Include Gift Bag</span>
                    {bagRequired && (
                      <select
                        value={bagSize}
                        onChange={(e) => setBagSize(e.target.value as any)}
                        className="ml-2 bg-transparent border-b border-foreground/20 py-1 text-xs focus:outline-none"
                      >
                        <option value="SMALL">Small Bag</option>
                        <option value="MEDIUM">Medium Bag</option>
                        <option value="LARGE">Large Bag</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-foreground/10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Ingredients per Box</span>
                    <button type="button" onClick={() => setItems((p) => [...p, { rawMaterialId: rawMaterials[0]?.id || '', actualPackingQty: 0.250, unit: 'KG' }])} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Add Item
                    </button>
                  </div>
                  {items.map((it, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <select value={it.rawMaterialId} onChange={(e) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, rawMaterialId: e.target.value } : x))} className="flex-1 bg-transparent border-b border-foreground/20 py-1.5 text-sm focus:outline-none">
                        {rawMaterials.map((r) => <option key={r.id} value={r.id}>{r.displayName}</option>)}
                      </select>
                      <Input type="number" step="0.001" value={it.actualPackingQty} onChange={(e) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, actualPackingQty: parseFloat(e.target.value) || 0 } : x))} className="w-24 text-right" />
                      <span className="text-xs text-muted-foreground w-8">KG</span>
                      {items.length > 1 && <button type="button" onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground"><Trash2 className="h-3 w-3" /></button>}
                    </div>
                  ))}
                </div>

                <Button type="submit" className="w-full">Save Recipe</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-0 border-b border-foreground/10 overflow-x-auto">
        {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-2.5 text-xs uppercase tracking-wider whitespace-nowrap border-b-2 -mb-px transition-colors ${filter === s ? 'border-foreground text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No sample recipes found.</p>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 touch-scroll">
          <table className="w-full text-left text-sm min-w-[580px]">
            <thead>
              <tr className="border-b border-foreground/10 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3 font-medium">Code</th>
                <th className="py-3 font-medium">Name</th>
                <th className="py-3 font-medium">Box</th>
                <th className="py-3 font-medium text-right">Made</th>
                <th className="py-3 font-medium text-right">Available</th>
                <th className="py-3 font-medium text-right">Status</th>
                <th className="py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sample) => {
                const box = boxes.find((b) => b.id === sample.boxId);
                return (
                  <tr key={sample.id} className="border-b border-foreground/5">
                    <td className="py-3 font-medium">{sample.sampleCode}</td>
                    <td className="py-3">{sample.sampleName}</td>
                    <td className="py-3 text-muted-foreground">{box?.boxCode || '—'}</td>
                    <td className="py-3 text-right tabular-nums">{sample.unitsMade}</td>
                    <td className="py-3 text-right tabular-nums font-semibold">{sample.unitsAvailable}</td>
                    <td className="py-3 text-right">
                      <Badge variant={sample.status === 'ACTIVE' ? 'success' : 'secondary'}>{sample.status}</Badge>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {sample.unitsAvailable > 0 && user?.role !== 'viewer' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Transfer to Direct Sale"
                              onClick={() => {
                                setSelectedSample(sample);
                                setSellRate(sample.manualMrp || 500);
                                setSellUnits(1);
                                setSaleModalOpen(true);
                              }}
                            >
                              <ShoppingCart className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Give as Free Sample or Personal Use"
                              onClick={() => {
                                setSelectedSample(sample);
                                setIssueUnits(1);
                                setIssueModalOpen(true);
                              }}
                            >
                              <Gift className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            </Button>
                          </>
                        )}
                        {user?.role === 'owner' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Delete recipe ${sample.sampleCode}?`)) {
                                deleteSample(sample.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={saleModalOpen} onOpenChange={setSaleModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transfer Sample to Direct Sale</DialogTitle></DialogHeader>
          <form onSubmit={handleSellSample} className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              Selling sample recipe: <strong>{selectedSample?.sampleCode} - {selectedSample?.sampleName}</strong>
            </p>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Customer</label>
              <select
                value={sellCustomerId}
                onChange={(e) => setSellCustomerId(e.target.value)}
                className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none"
              >
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Units to Sell</label>
                <Input
                  type="number"
                  min="1"
                  max={selectedSample?.unitsAvailable || 1}
                  value={sellUnits}
                  onChange={(e) => setSellUnits(parseInt(e.target.value) || 1)}
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Selling Rate (₹/unit)</label>
                <Input
                  type="number"
                  value={sellRate}
                  onChange={(e) => setSellRate(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full">Create Sales Order</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={issueModalOpen} onOpenChange={setIssueModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue Free Sample or Personal Use</DialogTitle></DialogHeader>
          <form onSubmit={handleIssueSample} className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              Issuing stock-out for: <strong>{selectedSample?.sampleCode} - {selectedSample?.sampleName}</strong>
            </p>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Units Issued</label>
              <Input
                type="number"
                min="1"
                max={selectedSample?.unitsAvailable || 1}
                value={issueUnits}
                onChange={(e) => setIssueUnits(parseInt(e.target.value) || 1)}
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Purpose / Reason</label>
              <Input
                value={issueReason}
                onChange={(e) => setIssueReason(e.target.value)}
                placeholder="Promotional sample / Tasting / Owner personal use"
                required
              />
            </div>
            <Button type="submit" className="w-full">Log Stock-Out Expense</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
