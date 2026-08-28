import React, { useState } from 'react';
import { useStore } from '@/services/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatINR, formatDate } from '@/lib/utils';
import { Calendar, Plus, Clock, AlertTriangle, ArrowRight, Search } from 'lucide-react';
import { OrderLineInput, ReservationStatus } from '@/types/sales';

export const ReservationsScreen: React.FC<{
  onNavigateToOrder?: (orderId: string) => void;
  initialReservationId?: string;
}> = ({ onNavigateToOrder, initialReservationId }) => {
  const {
    reservations,
    customers,
    boxes,
    rawMaterials,
    createReservation,
    convertReservationToSale,
    cancelReservation,
    user,
  } = useStore();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [openCreate, setOpenCreate] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [deliveryDate, setDeliveryDate] = useState(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
  const [deliveryTime, setDeliveryTime] = useState('14:00');
  const [deliveryMode, setDeliveryMode] = useState<'PICKUP' | 'DELIVERY'>('DELIVERY');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [resMode, setResMode] = useState<'BOX_RESERVATION_ONLY' | 'FULL_RESERVATION' | 'ITEMS_COMBO_RESERVATION'>('FULL_RESERVATION');

  // Lines
  const [lines, setLines] = useState<OrderLineInput[]>([
    {
      saleType: 'BOX_WITH_ITEMS',
      boxId: boxes[0]?.id || '',
      quantity: 10,
      sellingRatePerUnit: 750,
      bagRequired: true,
      bagSize: 'MEDIUM',
      items: rawMaterials.slice(0, 2).map((rm) => ({
        rawMaterialId: rm.id,
        actualPackingQty: 0.25,
        unit: rm.unit,
      })),
    },
  ]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return alert('Please select a customer.');

    const totalQuoted = lines.reduce((s, l) => s + l.quantity * l.sellingRatePerUnit, 0);

    createReservation({
      reservationDate: new Date().toISOString().split('T')[0],
      customerId,
      promisedDeliveryDate: deliveryDate,
      deliveryTime,
      pickupDeliveryMode: deliveryMode,
      deliveryAddress,
      contactPerson,
      status: 'CONFIRMED',
      mode: resMode,
      advanceAmount,
      totalFinalizedRate: totalQuoted,
      notes,
      lines,
    });

    setOpenCreate(false);
  };

  const handleConvert = (resId: string) => {
    if (confirm('Convert this reservation to a posted Sales Order and deduct physical inventory?')) {
      const order = convertReservationToSale(resId, new Date().toISOString().split('T')[0]);
      if (order && onNavigateToOrder) {
        onNavigateToOrder(order.id);
      }
    }
  };

  const filteredReservations = reservations.filter((r) => {
    if (initialReservationId && r.id === initialReservationId) return true;
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      const cust = customers.find((c) => c.id === r.customerId);
      const searchTarget = `${r.reservationNumber} ${cust?.name || ''} ${cust?.phone || ''} ${r.deliveryAddress || ''} ${r.notes || ''}`.toLowerCase();
      return searchTarget.includes(q);
    }
    return true;
  });

  const getUrgencyBadge = (targetDate: string, status: ReservationStatus) => {
    if (status === 'SOLD' || status === 'CANCELLED') return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(targetDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Overdue ({Math.abs(diffDays)}d)</Badge>;
    } else if (diffDays === 0) {
      return <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-1"><Clock className="h-3 w-3" /> Due Today</Badge>;
    } else if (diffDays <= 3) {
      return <Badge variant="outline" className="text-blue-500 border-blue-500/30 flex items-center gap-1"><Clock className="h-3 w-3" /> In {diffDays} days</Badge>;
    }
    return <span className="text-xs text-muted-foreground">{diffDays} days left</span>;
  };

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Reservations & Delivery Board</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Schedule promised deliveries, reserve stock balance, and convert to direct sales.
          </p>
        </div>
        {user?.role !== 'viewer' && (
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> New Reservation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Customer Reservation</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-6 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Customer</label>
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} {c.companyName ? `(${c.companyName})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Promised Delivery Date</label>
                    <Input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Delivery Time</label>
                    <Input
                      type="time"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Mode</label>
                    <select
                      value={deliveryMode}
                      onChange={(e) => setDeliveryMode(e.target.value as any)}
                      className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none"
                    >
                      <option value="DELIVERY">Delivery to Address</option>
                      <option value="PICKUP">Store / Godown Pickup</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Advance Received (₹)</label>
                    <Input
                      type="number"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Contact Person</label>
                    <Input
                      placeholder="Name / phone of receiver"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Reservation Type</label>
                    <select
                      value={resMode}
                      onChange={(e) => setResMode(e.target.value as any)}
                      className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none"
                    >
                      <option value="FULL_RESERVATION">Full Reservation (Box + Dry Fruits)</option>
                      <option value="BOX_RESERVATION_ONLY">Box Only Reservation</option>
                      <option value="ITEMS_COMBO_RESERVATION">Loose Items Combo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Notes / Instructions</label>
                  <Input
                    placeholder="Ribbon wrapping / greeting card text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {deliveryMode === 'DELIVERY' && (
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Delivery Address</label>
                    <Input
                      placeholder="Destination address / landmark"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                    />
                  </div>
                )}

                {/* Lines */}
                <div className="space-y-4 pt-2 border-t border-foreground/10">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Reserved Items</h3>
                  {lines.map((l, li) => {
                    return (
                      <div key={li} className="p-4 border border-foreground/10 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Box Design</label>
                            <select
                              value={l.boxId}
                              onChange={(e) => {
                                const bid = e.target.value;
                                setLines((prev) => prev.map((pl, idx) => idx === li ? { ...pl, boxId: bid } : pl));
                              }}
                              className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none"
                            >
                              {boxes.map((b) => <option key={b.id} value={b.id}>{b.boxCode} - {b.boxName || 'Gift Box'}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Quantity</label>
                            <Input
                              type="number"
                              min="1"
                              value={l.quantity}
                              onChange={(e) => {
                                const q = parseInt(e.target.value) || 1;
                                setLines((prev) => prev.map((pl, idx) => idx === li ? { ...pl, quantity: q } : pl));
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Quoted Rate (₹/unit)</label>
                            <Input
                              type="number"
                              value={l.sellingRatePerUnit}
                              onChange={(e) => {
                                const r = parseFloat(e.target.value) || 0;
                                setLines((prev) => prev.map((pl, idx) => idx === li ? { ...pl, sellingRatePerUnit: r } : pl));
                              }}
                            />
                          </div>
                        </div>

                        {/* Ingredients */}
                        <div className="pl-4 border-l-2 border-foreground/10 space-y-2">
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Packing Specification (per box)</p>
                          {l.items.map((it, ii) => (
                            <div key={ii} className="flex items-center gap-3 text-sm">
                              <span className="flex-1 font-medium">{rawMaterials.find((r) => r.id === it.rawMaterialId)?.displayName}</span>
                              <Input
                                type="number"
                                step="0.001"
                                value={it.actualPackingQty}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setLines((prev) => prev.map((pl, idx) => idx === li ? {
                                    ...pl,
                                    items: pl.items.map((pi, pii) => pii === ii ? { ...pi, actualPackingQty: val } : pi),
                                  } : pl));
                                }}
                                className="w-24 text-right"
                              />
                              <span className="text-xs text-muted-foreground w-8">KG</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button type="submit" className="w-full">Save & Reserve Stock</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-foreground/10 pb-2">
        <div className="flex gap-2 overflow-x-auto">
          {['ALL', 'CONFIRMED', 'SOLD', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider border-b-2 -mb-2 transition-colors ${
                filterStatus === st
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {st} ({st === 'ALL' ? reservations.length : reservations.filter((r) => r.status === st).length})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search reservations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
      </div>

      {/* Reservations List */}
      {filteredReservations.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border border-dashed border-foreground/10">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No reservations in this view.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReservations.map((res) => {
            const customer = customers.find((c) => c.id === res.customerId);
            return (
              <div key={res.id} className="p-6 border border-foreground/10 bg-background space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-lg">{res.reservationNumber}</span>
                        <Badge variant={res.status === 'SOLD' ? 'success' : res.status === 'CONFIRMED' ? 'outline' : 'destructive'}>
                          {res.status}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium mt-1">{customer?.name} {customer?.companyName ? `(${customer.companyName})` : ''}</p>
                    </div>
                    {getUrgencyBadge(res.promisedDeliveryDate, res.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-foreground/5 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Delivery Target</span>
                      <span className="font-medium">{formatDate(res.promisedDeliveryDate)} {res.deliveryTime || ''}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Quoted Amount</span>
                      <span className="font-medium">{formatINR(res.totalFinalizedRate)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Advance Paid</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatINR(res.advanceAmount)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Fulfillment</span>
                      <span className="font-medium">{res.pickupDeliveryMode}</span>
                    </div>
                  </div>

                  {/* Reserved Items summary */}
                  <div className="mt-3 text-xs text-muted-foreground">
                    {res.lines.map((l, i) => {
                      const box = boxes.find((b) => b.id === l.boxId);
                      return (
                        <div key={i} className="flex justify-between py-0.5">
                          <span>{l.quantity}× {box?.boxCode || 'Custom Set'}</span>
                          <span>{formatINR(l.quantity * l.sellingRatePerUnit)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                {res.status === 'CONFIRMED' && user?.role !== 'viewer' && (
                  <div className="flex gap-2 pt-4 border-t border-foreground/10">
                    <Button
                      onClick={() => handleConvert(res.id)}
                      className="flex-1 text-xs"
                      size="sm"
                    >
                      Convert to Sale <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Cancel this reservation and release reserved stock?')) {
                          cancelReservation(res.id);
                        }
                      }}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      Cancel
                    </Button>
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
