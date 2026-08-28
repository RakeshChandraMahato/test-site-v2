import React, { useState } from 'react';
import { useStore } from '@/services/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatINR, formatDate, formatQty } from '@/lib/utils';
import { Download, Search, Layers, Activity, TrendingDown } from 'lucide-react';

export const ReportsScreen: React.FC = () => {
  const { movements, rawMaterials, boxes, orders, user } = useStore();
  const canSeeCosts = user?.role !== 'staff';
  const [activeTab, setActiveTab] = useState<'consumption' | 'movements' | 'expenses'>('consumption');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // 1. Raw Material Consumption Calculation
  const consumptionByMaterial = rawMaterials.map((rm) => {
    const saleMovements = movements.filter(
      (m) => m.itemType === 'RAW_MATERIAL' && m.itemId === rm.id && m.movementType === 'DIRECT_SALE'
    );
    const sampleMovements = movements.filter(
      (m) => m.itemType === 'RAW_MATERIAL' && m.itemId === rm.id && m.movementType === 'SAMPLE_OR_HOME_OUT'
    );

    const totalSoldQty = Math.abs(saleMovements.reduce((s, m) => s + m.physicalQtyDelta, 0));
    const totalSampleQty = Math.abs(sampleMovements.reduce((s, m) => s + m.physicalQtyDelta, 0));
    const totalConsumed = totalSoldQty + totalSampleQty;
    const totalCostValue = totalConsumed * rm.currentLandedPurchaseRate;

    return {
      ...rm,
      totalSoldQty,
      totalSampleQty,
      totalConsumed,
      totalCostValue,
    };
  });

  // 2. Stock-Out / Damage Expenses Calculation
  const expenseMovements = movements.filter(
    (m) =>
      m.movementType === 'DAMAGE_UNREPAIRABLE' ||
      m.movementType === 'SAMPLE_OR_HOME_OUT'
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

  // 3. Filtered Movement Ledger
  const filteredMovements = movements.filter((m) => {
    if (selectedType !== 'ALL' && m.movementType !== selectedType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.documentId.toLowerCase().includes(q) ||
        m.movementType.toLowerCase().includes(q) ||
        (m.remarks && m.remarks.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Export CSV
  const exportLedgerToCSV = () => {
    const headers = ['Timestamp', 'Movement Type', 'Item Type', 'Item Code/Name', 'Delta', 'Condition Bucket', 'Document ID', 'Remarks'];
    const rows = movements.map((m) => {
      const name = m.itemType === 'BOX'
        ? boxes.find((b) => b.id === m.itemId)?.boxCode || m.itemId
        : rawMaterials.find((r) => r.id === m.itemId)?.displayName || m.itemId;
      return [
        m.createdAt,
        m.movementType,
        m.itemType,
        `"${name}"`,
        m.physicalQtyDelta,
        m.conditionBucket,
        m.documentId,
        `"${m.remarks || ''}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `asj_stock_movements_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Reports & Audit Center</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Material consumption, immutable ledger audit trails, and expense analytics.
          </p>
        </div>
        <Button onClick={exportLedgerToCSV} variant="outline" size="sm">
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export Ledger CSV
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-foreground/10 overflow-x-auto pb-px">
        {[
          { id: 'consumption', label: 'Material Usage Report', icon: Layers },
          { id: 'movements', label: 'Full Movement Ledger', icon: Activity },
          ...(canSeeCosts ? [{ id: 'expenses', label: 'Stock-Out Expenses', icon: TrendingDown }] : []),
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium uppercase tracking-wider border-b-2 -mb-px transition-colors ${
                activeTab === t.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Raw Material Usage */}
      {activeTab === 'consumption' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-px border border-foreground/10">
            <div className="bg-background p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Materials Tracked</p>
              <p className="text-2xl font-serif font-bold mt-2">{rawMaterials.length}</p>
            </div>
            {canSeeCosts ? (
              <div className="bg-background p-6">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Material Cost Consumed</p>
                <p className="text-2xl font-serif font-bold mt-2">
                  {formatINR(consumptionByMaterial.reduce((s, m) => s + m.totalCostValue, 0))}
                </p>
              </div>
            ) : (
              <div className="bg-background p-6">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Material Categories</p>
                <p className="text-2xl font-serif font-bold mt-2">Active</p>
              </div>
            )}
            <div className="bg-background p-6 col-span-2 lg:col-span-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Posted Orders</p>
              <p className="text-2xl font-serif font-bold mt-2">
                {orders.filter((o) => o.status === 'POSTED').length}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-foreground/10">
            <table className="w-full text-left text-sm min-w-[650px]">
              <thead>
                <tr className="border-b border-foreground/10 text-xs uppercase tracking-wider text-muted-foreground bg-secondary/20">
                  <th className="py-3 px-4 font-medium">Material</th>
                  <th className="py-3 px-4 font-medium text-right">Sold in Orders</th>
                  <th className="py-3 px-4 font-medium text-right">Used in Samples</th>
                  <th className="py-3 px-4 font-medium text-right">Total Usage</th>
                  {canSeeCosts && <th className="py-3 px-4 font-medium text-right">Purchase Cost Value</th>}
                </tr>
              </thead>
              <tbody>
                {consumptionByMaterial.map((rm) => (
                  <tr key={rm.id} className="border-b border-foreground/5">
                    <td className="py-3 px-4">
                      <span className="font-medium">{rm.displayName}</span>
                      {rm.variant && <span className="text-xs text-muted-foreground ml-2">{rm.variant}</span>}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatQty(rm.totalSoldQty, rm.unit)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">{formatQty(rm.totalSampleQty, rm.unit)}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold">{formatQty(rm.totalConsumed, rm.unit)}</td>
                    {canSeeCosts && <td className="py-3 px-4 text-right tabular-nums font-serif">{formatINR(rm.totalCostValue)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Full Movement Ledger */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reference, reason, or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent border border-foreground/20 rounded px-3 py-2 text-sm focus:outline-none"
            >
              <option value="ALL">All Movement Types</option>
              <option value="PURCHASE_IN">Purchase In</option>
              <option value="DIRECT_SALE">Direct Sale</option>
              <option value="TRANSFER_IN">Transfer In</option>
              <option value="TRANSFER_OUT">Transfer Out</option>
              <option value="DAMAGE_REPAIRABLE">Damage (Hold)</option>
              <option value="DAMAGE_UNREPAIRABLE">Damage (Write Off)</option>
              <option value="DAMAGE_REPAIRED">Repaired</option>
              <option value="RESERVE">Stock Reserve</option>
              <option value="SAMPLE_OR_HOME_OUT">Sample / Home Issue</option>
            </select>
          </div>

          <div className="overflow-x-auto border border-foreground/10">
            <table className="w-full text-left text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-foreground/10 text-xs uppercase tracking-wider text-muted-foreground bg-secondary/20">
                  <th className="py-3 px-4 font-medium">Timestamp</th>
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium">Item</th>
                  <th className="py-3 px-4 font-medium text-right">Delta</th>
                  <th className="py-3 px-4 font-medium">Bucket</th>
                  <th className="py-3 px-4 font-medium">Reference / User</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.slice(0, 50).map((m) => {
                  const itemName =
                    m.itemType === 'BOX'
                      ? boxes.find((b) => b.id === m.itemId)?.boxCode || 'Box'
                      : rawMaterials.find((r) => r.id === m.itemId)?.displayName || 'Material';

                  return (
                    <tr key={m.id} className="border-b border-foreground/5">
                      <td className="py-3 px-4 text-xs text-muted-foreground">{formatDate(m.createdAt)}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {m.movementType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium">{itemName}</td>
                      <td className={`py-3 px-4 text-right tabular-nums font-semibold ${
                        m.physicalQtyDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : m.physicalQtyDelta < 0 ? 'text-rose-600 dark:text-rose-400' : ''
                      }`}>
                        {m.physicalQtyDelta > 0 ? `+${m.physicalQtyDelta}` : m.physicalQtyDelta}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{m.conditionBucket}</td>
                      <td className="py-3 px-4 text-xs">
                        <p className="font-medium truncate max-w-[200px]">{m.documentId}</p>
                        <p className="text-muted-foreground">{m.createdBy}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Stock Out Expenses */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="p-6 border border-destructive/20 bg-destructive/5 space-y-2">
            <h3 className="font-serif font-bold text-lg">Total Stock-Out Operating Loss</h3>
            <p className="text-3xl font-serif font-bold text-destructive">{formatINR(totalStockOutLoss)}</p>
            <p className="text-xs text-muted-foreground">
              Includes non-recoverable damage write-offs, free promotional gifts, and personal home issues.
            </p>
          </div>

          <div className="overflow-x-auto border border-foreground/10">
            <table className="w-full text-left text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-foreground/10 text-xs uppercase tracking-wider text-muted-foreground bg-secondary/20">
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Reason</th>
                  <th className="py-3 px-4 font-medium">Item</th>
                  <th className="py-3 px-4 font-medium text-right">Qty</th>
                  <th className="py-3 px-4 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {expenseMovements.map((m) => {
                  const itemName =
                    m.itemType === 'BOX'
                      ? boxes.find((b) => b.id === m.itemId)?.boxCode || 'Box'
                      : rawMaterials.find((r) => r.id === m.itemId)?.displayName || 'Material';

                  return (
                    <tr key={m.id} className="border-b border-foreground/5">
                      <td className="py-3 px-4 text-xs text-muted-foreground">{formatDate(m.createdAt)}</td>
                      <td className="py-3 px-4 font-medium">
                        <Badge variant="destructive" className="text-[10px]">
                          {m.movementType === 'DAMAGE_UNREPAIRABLE' ? 'IRREPARABLE DAMAGE' : 'FREE ISSUE / HOME'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium">{itemName}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-rose-600">{Math.abs(m.physicalQtyDelta)}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{m.remarks || m.documentId}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
