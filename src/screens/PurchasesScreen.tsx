import React, { useState } from 'react';
import { useStore } from '@/services/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatINR, formatDate } from '@/lib/utils';
import { ShoppingBag, Plus, ShieldAlert, Download, Search } from 'lucide-react';
import { generatePurchasesTallyXML, downloadFile } from '@/services/tallyExportService';
import { compressAndUploadImage } from '@/services/imageService';

export const PurchasesScreen: React.FC = () => {
  const {
    purchases,
    suppliers,
    boxes,
    rawMaterials,
    godowns,
    postPurchase,
    addBox,
    user,
  } = useStore();

  if (user?.role === 'staff' || user?.role === 'viewer') {
    return (
      <div className="max-w-2xl py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="font-serif text-2xl font-bold">Access Restricted</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Purchase entry, supplier invoices, landed cost math, and vendor ledger management are restricted to <strong>Owner</strong> and <strong>Manager</strong> accounts.
        </p>
      </div>
    );
  }

  const [openDialog, setOpenDialog] = useState(false);
  const [itemType, setItemType] = useState<'BOX' | 'RAW_MATERIAL'>('BOX');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [godownId, setGodownId] = useState(godowns[0]?.id || '');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  // Box Specific: Existing vs New Design
  const [isNewBox, setIsNewBox] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState(boxes[0]?.id || '');
  const [newBoxCode, setNewBoxCode] = useState('');
  const [newBoxName, setNewBoxName] = useState('');
  const [newBoxImage, setNewBoxImage] = useState('/boxes/BX001.png');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Raw Material Specific
  const [selectedRmId, setSelectedRmId] = useState(rawMaterials[0]?.id || '');

  // Numbers & Math
  const [orderedQty, setOrderedQty] = useState(100);
  const [acceptedQty, setAcceptedQty] = useState(100);
  const [damagedQty, setDamagedQty] = useState(0);
  const [unitRateBeforeGst, setUnitRateBeforeGst] = useState(120);
  const [gstPct, setGstPct] = useState(18);
  const [isItcEligible, setIsItcEligible] = useState(true);
  const [transportTotal, setTransportTotal] = useState(500);
  const [otherDirectCosts, setOtherDirectCosts] = useState(0);
  const [extraProfitPct, setExtraProfitPct] = useState(0);
  const [notes, setNotes] = useState('');

  // Calculations
  const nonRecoverableGstPerUnit = !isItcEligible ? (unitRateBeforeGst * gstPct) / 100 : 0;
  const transportPerUnit = acceptedQty > 0 ? (transportTotal + otherDirectCosts) / acceptedQty : 0;
  const calculatedLandedCost = unitRateBeforeGst + nonRecoverableGstPerUnit + transportPerUnit;
  const calculatedFinalRate = calculatedLandedCost * (1 + (25 + extraProfitPct) / 100);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await compressAndUploadImage(file, 'box-designs');
      setNewBoxImage(url);
    } catch (err) {
      console.error(err);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (acceptedQty <= 0) return alert('Accepted quantity must be greater than 0');

    let finalItemId = itemType === 'BOX' ? selectedBoxId : selectedRmId;

    // If creating a brand new box design during purchase
    if (itemType === 'BOX' && isNewBox) {
      if (!newBoxCode) return alert('Box code is required');
      const boxData = {
        boxCode: newBoxCode.toUpperCase(),
        boxName: newBoxName,
        imageUrl: newBoxImage,
        displayOrder: boxes.length + 1,
        status: 'ACTIVE' as const,
        currentLandedCost: calculatedLandedCost,
        currentFinalRate: calculatedFinalRate,
      };
      // Fix 1: Use the actual DB-assigned ID returned by addBox
      finalItemId = await addBox(boxData);
    }

    postPurchase({
      purchaseDate,
      supplierId: supplierId || suppliers[0]?.id || 'sup-1',
      invoiceReference: invoiceRef,
      destinationGodownId: godownId || godowns[0]?.id || 'g-1',
      itemType,
      itemId: finalItemId,
      orderedQty,
      acceptedQty,
      damagedQty,
      purchaseUnitRate: unitRateBeforeGst,
      gstPct,
      isItcEligible,
      transportTotal,
      otherDirectCosts,
      specialExtraProfitPct: extraProfitPct,
      calculatedLandedCost,
      calculatedFinalRate,
      notes,
    });

    setOpenDialog(false);
  };

  const [search, setSearch] = useState('');

  const filteredPurchases = purchases.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const sup = suppliers.find((s) => s.id === p.supplierId);
    const box = boxes.find((b) => b.id === p.itemId);
    const rm = rawMaterials.find((r) => r.id === p.itemId);
    const target = `${p.purchaseNumber} ${p.invoiceReference || ''} ${sup?.name || ''} ${box?.boxCode || ''} ${rm?.displayName || ''} ${p.notes || ''}`.toLowerCase();
    return target.includes(q);
  });

  const handleExportTally = () => {
    if (filteredPurchases.length === 0) return alert('No purchases to export.');
    const xml = generatePurchasesTallyXML(filteredPurchases, suppliers);
    downloadFile(xml, `asj_purchases_tally_${new Date().toISOString().slice(0, 10)}.xml`, 'application/xml');
  };

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Purchases & Restocking</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Inward inventory entry with automated Landed Cost math and rate propagation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportTally} title="Download Tally Purchases XML">
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export Tally XML
          </Button>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Inward Purchase Entry
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Inward Stock Purchase Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              {/* Type Switch */}
              <div className="flex gap-2 border-b border-foreground/10 pb-2">
                <button
                  type="button"
                  onClick={() => setItemType('BOX')}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded ${
                    itemType === 'BOX' ? 'bg-foreground text-background' : 'bg-secondary/40 text-muted-foreground'
                  }`}
                >
                  Box Design Purchase
                </button>
                <button
                  type="button"
                  onClick={() => setItemType('RAW_MATERIAL')}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded ${
                    itemType === 'RAW_MATERIAL' ? 'bg-foreground text-background' : 'bg-secondary/40 text-muted-foreground'
                  }`}
                >
                  Raw Material Inward
                </button>
              </div>

              {/* Vendor & Invoice */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Supplier</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none"
                  >
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Destination Godown</label>
                  <select
                    value={godownId}
                    onChange={(e) => setGodownId(e.target.value)}
                    className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none"
                  >
                    {godowns.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Invoice / Challan #</label>
                  <Input
                    placeholder="INV-9921"
                    value={invoiceRef}
                    onChange={(e) => setInvoiceRef(e.target.value)}
                  />
                </div>
              </div>

              {/* Item Selection */}
              {itemType === 'BOX' ? (
                <div className="space-y-4 p-4 border border-foreground/10">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="radio"
                        checked={!isNewBox}
                        onChange={() => setIsNewBox(false)}
                        className="accent-foreground"
                      />
                      Restock Existing Design
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="radio"
                        checked={isNewBox}
                        onChange={() => setIsNewBox(true)}
                        className="accent-foreground"
                      />
                      New Box Design Batch
                    </label>
                  </div>

                  {!isNewBox ? (
                    <div>
                      <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Select Box Design</label>
                      <select
                        value={selectedBoxId}
                        onChange={(e) => setSelectedBoxId(e.target.value)}
                        className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none"
                      >
                        {boxes.map((b) => <option key={b.id} value={b.id}>{b.boxCode} - {b.boxName || 'Standard'}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">New Box Code</label>
                        <Input
                          placeholder="BX009"
                          value={newBoxCode}
                          onChange={(e) => setNewBoxCode(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Design Name</label>
                        <Input
                          placeholder="Royal Velvet Quad"
                          value={newBoxName}
                          onChange={(e) => setNewBoxName(e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Design Image</label>
                        <div className="flex items-center gap-4">
                          <img src={newBoxImage} alt="Preview" className="w-12 h-12 object-contain border p-1 bg-secondary/20" />
                          <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 border border-foreground/10">
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Raw Material</label>
                  <select
                    value={selectedRmId}
                    onChange={(e) => setSelectedRmId(e.target.value)}
                    className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none"
                  >
                    {rawMaterials.map((r) => <option key={r.id} value={r.id}>{r.displayName} ({r.unit})</option>)}
                  </select>
                </div>
              )}

              {/* Quantities */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Ordered Qty</label>
                  <Input
                    type="number"
                    value={orderedQty}
                    onChange={(e) => setOrderedQty(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Accepted Qty</label>
                  <Input
                    type="number"
                    value={acceptedQty}
                    onChange={(e) => setAcceptedQty(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Damaged / Rejected</label>
                  <Input
                    type="number"
                    value={damagedQty}
                    onChange={(e) => setDamagedQty(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Rates and Taxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Rate Before Tax (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={unitRateBeforeGst}
                    onChange={(e) => setUnitRateBeforeGst(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">GST %</label>
                  <Input
                    type="number"
                    value={gstPct}
                    onChange={(e) => setGstPct(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">ITC Eligible?</label>
                  <select
                    value={isItcEligible ? 'yes' : 'no'}
                    onChange={(e) => setIsItcEligible(e.target.value === 'yes')}
                    className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none"
                  >
                    <option value="yes">Yes (GST Refundable)</option>
                    <option value="no">No (Add GST to Cost)</option>
                  </select>
                </div>
              </div>

              {/* Direct Expenses & Additional Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Freight / Transport Total (₹)</label>
                  <Input
                    type="number"
                    value={transportTotal}
                    onChange={(e) => setTransportTotal(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Other Direct Costs (₹)</label>
                  <Input
                    type="number"
                    value={otherDirectCosts}
                    onChange={(e) => setOtherDirectCosts(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Purchase Inward Date</label>
                  <Input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Extra Profit / Premium %</label>
                  <Input
                    type="number"
                    value={extraProfitPct}
                    onChange={(e) => setExtraProfitPct(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Purchase Notes</label>
                <Input
                  placeholder="Batch #, supplier vehicle info, or delivery remarks"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Live Cost Preview Card */}
              <div className="p-4 bg-secondary/30 border border-foreground/10 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Non-recoverable Tax / Unit</span>
                  <span>{formatINR(nonRecoverableGstPerUnit)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Freight allocation / Unit</span>
                  <span>{formatINR(transportPerUnit)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t border-foreground/10 pt-2">
                  <span>Landed Unit Cost</span>
                  <span className="font-serif text-base">{formatINR(calculatedLandedCost)}</span>
                </div>
                {itemType === 'BOX' && (
                  <div className="flex justify-between text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    <span>New Master Final Rate (with markup)</span>
                    <span className="font-serif text-base">{formatINR(calculatedFinalRate)}</span>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full">
                Post Purchase & Inward Stock
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* History Register */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Purchase Register</h2>
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search purchases or suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>
        </div>

        {filteredPurchases.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground border border-dashed border-foreground/10">
            <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">
              {search ? `No purchases matching "${search}"` : 'No purchase entries recorded yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-foreground/10">
            <table className="w-full text-left text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-foreground/10 text-xs uppercase tracking-wider text-muted-foreground bg-secondary/20">
                  <th className="py-3 px-4 font-medium">Purchase #</th>
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Supplier</th>
                  <th className="py-3 px-4 font-medium">Item</th>
                  <th className="py-3 px-4 font-medium text-right">Accepted Qty</th>
                  <th className="py-3 px-4 font-medium text-right">Landed Rate</th>
                  <th className="py-3 px-4 font-medium text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((p) => {
                  const sup = suppliers.find((s) => s.id === p.supplierId);
                  const itemName =
                    p.itemType === 'BOX'
                      ? boxes.find((b) => b.id === p.itemId)?.boxCode || 'Box'
                      : rawMaterials.find((r) => r.id === p.itemId)?.displayName || 'Material';
                  return (
                    <tr key={p.id} className="border-b border-foreground/5">
                      <td className="py-3 px-4 font-medium">{p.purchaseNumber}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{formatDate(p.purchaseDate)}</td>
                      <td className="py-3 px-4">{sup?.name || 'Supplier'}</td>
                      <td className="py-3 px-4 font-medium">{itemName}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{p.acceptedQty}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{formatINR(p.calculatedLandedCost)}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-semibold">{formatINR(p.acceptedQty * p.calculatedLandedCost)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
