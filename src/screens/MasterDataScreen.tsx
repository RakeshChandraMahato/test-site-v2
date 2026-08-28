import React, { useState } from 'react';
import { useStore } from '@/services/storeContext';
import { Box, Customer, RawMaterial, Supplier } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { compressAndUploadImage } from '@/services/imageService';
import { formatINR } from '@/lib/utils';
import { Plus, Edit2, Trash2, ShieldAlert, Search } from 'lucide-react';

export const MasterDataScreen: React.FC = () => {
  const {
    user,
    boxes,
    rawMaterials,
    productGroups,
    customers,
    suppliers,
    godowns,
    giftBags,
    addBox,
    updateBox,
    deleteBox,
    addRawMaterial,
    updateRawMaterial,
    deleteRawMaterial,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addGodown,
    updateGodown,
    deleteGodown,
    updateGiftBagRate,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'boxes' | 'materials' | 'customers' | 'suppliers' | 'settings'>('boxes');
  const [masterSearch, setMasterSearch] = useState('');

  if (user?.role === 'staff' || user?.role === 'viewer') {
    return (
      <div className="max-w-2xl py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="font-serif text-2xl font-bold">Access Restricted</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Master rates and catalog configuration are managed by <strong>Owner</strong> and <strong>Manager</strong> accounts only.
        </p>
        <p className="text-xs text-muted-foreground">
          Current signed-in role: <span className="uppercase font-semibold text-foreground">{user?.role || 'Guest'}</span>
        </p>
      </div>
    );
  }

  // Box State
  const [boxDialogOpen, setBoxDialogOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<Box | null>(null);
  const [boxCode, setBoxCode] = useState('');
  const [boxName, setBoxName] = useState('');
  const [category, setCategory] = useState('Premium Gift Box');
  const [landedCost, setLandedCost] = useState(0);
  const [finalRate, setFinalRate] = useState(0);
  const [imageUrl, setImageUrl] = useState('/boxes/BX001.png');
  const [uploading, setUploading] = useState(false);

  // Raw Material State
  const [rmDialogOpen, setRmDialogOpen] = useState(false);
  const [editingRm, setEditingRm] = useState<RawMaterial | null>(null);
  const [rmName, setRmName] = useState('');
  const [rmVariant, setRmVariant] = useState('');
  const [rmGroupId, setRmGroupId] = useState(productGroups[0]?.id || '');
  const [rmUnit, setRmUnit] = useState<'KG' | 'PCS'>('KG');
  const [rmLandedRate, setRmLandedRate] = useState(0);
  const [rmInternalRate, setRmInternalRate] = useState(0);

  // Customer State
  const [custDialogOpen, setCustDialogOpen] = useState(false);
  const [editingCust, setEditingCust] = useState<Customer | null>(null);
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cCompany, setCCompany] = useState('');
  const [cAddress, setCAddress] = useState('');
  const [cNotes, setCNotes] = useState('');

  // Supplier State
  const [supDialogOpen, setSupDialogOpen] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplier | null>(null);
  const [sName, setSName] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sTax, setSTax] = useState('');
  const [sTerms, setSTerms] = useState('');

  const openSupModal = (s?: Supplier) => {
    if (s) {
      setEditingSup(s);
      setSName(s.name);
      setSPhone(s.phone || '');
      setSTax(s.taxDetails || '');
      setSTerms(s.paymentTerms || '');
    } else {
      setEditingSup(null);
      setSName('');
      setSPhone('');
      setSTax('');
      setSTerms('30 Days Credit');
    }
    setSupDialogOpen(true);
  };

  const handleSaveSup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName) return alert('Supplier name required');
    if (editingSup) {
      await updateSupplier(editingSup.id, {
        name: sName,
        phone: sPhone,
        taxDetails: sTax,
        paymentTerms: sTerms,
      });
    } else {
      await addSupplier({
        name: sName,
        phone: sPhone,
        taxDetails: sTax,
        paymentTerms: sTerms,
        active: true,
      });
    }
    setSupDialogOpen(false);
  };

  // Godown State
  const [godownName, setGodownName] = useState('');

  const openBoxModal = (b?: Box) => {
    if (b) {
      setEditingBox(b);
      setBoxCode(b.boxCode);
      setBoxName(b.boxName || '');
      setCategory(b.category || 'Premium Gift Box');
      setLandedCost(b.currentLandedCost || 0);
      setFinalRate(b.currentFinalRate || 0);
      setImageUrl(b.imageUrl || '/boxes/BX001.png');
    } else {
      setEditingBox(null);
      setBoxCode(`BX0${boxes.length + 1}`);
      setBoxName('');
      setCategory('Premium Gift Box');
      setLandedCost(0);
      setFinalRate(0);
      setImageUrl('/boxes/BX001.png');
    }
    setBoxDialogOpen(true);
  };

  const handleSaveBox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boxCode) return alert('Box code required');
    if (editingBox) {
      await updateBox(
        editingBox.id,
        { boxCode, boxName: boxName || undefined, category, imageUrl },
        { landed: landedCost, final: finalRate }
      );
    } else {
      await addBox({
        boxCode,
        boxName: boxName || undefined,
        category,
        imageUrl,
        displayOrder: boxes.length + 1,
        status: 'ACTIVE',
        currentLandedCost: landedCost,
        currentFinalRate: finalRate,
      });
    }
    setBoxDialogOpen(false);
  };

  const openRmModal = (r?: RawMaterial) => {
    if (r) {
      setEditingRm(r);
      setRmName(r.displayName);
      setRmVariant(r.variant || '');
      setRmGroupId(r.productGroupId);
      setRmUnit(r.unit);
      setRmLandedRate(r.currentLandedPurchaseRate || 0);
      setRmInternalRate(r.currentInternalSellingRate || 0);
    } else {
      setEditingRm(null);
      setRmName('');
      setRmVariant('');
      setRmGroupId(productGroups[0]?.id || '');
      setRmUnit('KG');
      setRmLandedRate(0);
      setRmInternalRate(0);
    }
    setRmDialogOpen(true);
  };

  const handleSaveRm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rmName) return alert('Material name required');
    if (editingRm) {
      await updateRawMaterial(
        editingRm.id,
        { displayName: rmName, variant: rmVariant, productGroupId: rmGroupId, unit: rmUnit },
        { landed: rmLandedRate, internal: rmInternalRate }
      );
    } else {
      await addRawMaterial({
        displayName: rmName,
        variant: rmVariant,
        productGroupId: rmGroupId,
        unit: rmUnit,
        status: 'ACTIVE',
        currentLandedPurchaseRate: rmLandedRate,
        currentInternalSellingRate: rmInternalRate,
        presets: [0.100, 0.250, 0.500],
      });
    }
    setRmDialogOpen(false);
  };

  const openCustModal = (c?: Customer) => {
    if (c) {
      setEditingCust(c);
      setCName(c.name);
      setCPhone(c.phone || '');
      setCCompany(c.companyName || '');
      setCAddress(c.deliveryAddress || '');
      setCNotes(c.notes || '');
    } else {
      setEditingCust(null);
      setCName('');
      setCPhone('');
      setCCompany('');
      setCAddress('');
      setCNotes('');
    }
    setCustDialogOpen(true);
  };

  const handleSaveCust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName) return alert('Customer name required');
    if (editingCust) {
      await updateCustomer(editingCust.id, {
        name: cName,
        phone: cPhone,
        companyName: cCompany,
        deliveryAddress: cAddress,
        notes: cNotes,
      });
    } else {
      await addCustomer({
        name: cName,
        phone: cPhone,
        companyName: cCompany,
        deliveryAddress: cAddress,
        notes: cNotes,
      });
    }
    setCustDialogOpen(false);
  };

  const mq = masterSearch.toLowerCase().trim();
  const filteredBoxes = boxes.filter((b) => !mq || b.boxCode.toLowerCase().includes(mq) || b.boxName?.toLowerCase().includes(mq));
  const filteredMaterials = rawMaterials.filter((r) => !mq || r.displayName.toLowerCase().includes(mq) || r.variant?.toLowerCase().includes(mq));
  const filteredCustomers = customers.filter((c) => !mq || c.name.toLowerCase().includes(mq) || c.phone?.toLowerCase().includes(mq) || c.companyName?.toLowerCase().includes(mq) || c.deliveryAddress?.toLowerCase().includes(mq));
  const filteredSuppliers = suppliers.filter((s) => !mq || s.name.toLowerCase().includes(mq) || s.phone?.toLowerCase().includes(mq) || s.taxDetails?.toLowerCase().includes(mq));

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Master data & settings</h1>
          <p className="text-sm text-muted-foreground mt-2">Manage box catalog, dry fruits, customers, godowns & live rates.</p>
        </div>
        {activeTab !== 'settings' && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={masterSearch}
              onChange={(e) => setMasterSearch(e.target.value)}
              className="pl-8 text-xs"
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-foreground/10 overflow-x-auto">
        {[
          { id: 'boxes', label: `Boxes (${boxes.length})` },
          { id: 'materials', label: `Raw materials (${rawMaterials.length})` },
          { id: 'customers', label: `Customers (${customers.length})` },
          { id: 'suppliers', label: `Suppliers (${suppliers.length})` },
          { id: 'settings', label: 'Godowns & bags' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id as any);
              setMasterSearch('');
            }}
            className={`px-4 py-2.5 text-xs uppercase tracking-wider whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activeTab === t.id
                ? 'border-foreground text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* BOXES TAB */}
      {activeTab === 'boxes' && (
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Box catalog & rates</h2>
            <Button size="sm" onClick={() => openBoxModal()}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add box
            </Button>
          </div>

          {filteredBoxes.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              {masterSearch ? `No boxes matching "${masterSearch}"` : 'No box designs yet.'}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 touch-scroll">
              <table className="w-full text-left text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-foreground/10 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 font-medium">Design</th>
                    <th className="py-3 font-medium text-right">Landed</th>
                    <th className="py-3 font-medium text-right">Final rate</th>
                    <th className="py-3 font-medium text-right">Status</th>
                    <th className="py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBoxes.map((b) => (
                    <tr key={b.id} className="border-b border-foreground/5">
                      <td className="py-3 flex items-center gap-3">
                        <div className="w-12 h-12 aspect-square bg-secondary/30 p-1 shrink-0 overflow-hidden flex items-center justify-center">
                          <img src={b.imageUrl} alt={b.boxCode} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">{b.boxCode}</span>
                          {b.boxName && <p className="text-xs text-muted-foreground">{b.boxName}</p>}
                        </div>
                      </td>
                      <td className="py-3 text-right tabular-nums text-muted-foreground">{formatINR(b.currentLandedCost)}</td>
                      <td className="py-3 text-right tabular-nums font-medium">{formatINR(b.currentFinalRate)}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => updateBox(b.id, { status: b.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                          className="cursor-pointer"
                        >
                          <Badge variant={b.status === 'ACTIVE' ? 'success' : 'secondary'}>{b.status}</Badge>
                        </button>
                      </td>
                      <td className="py-3 text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => openBoxModal(b)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete box ${b.boxCode}?`)) deleteBox(b.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* RAW MATERIALS TAB */}
      {activeTab === 'materials' && (
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Raw materials & rates</h2>
            <Button size="sm" onClick={() => openRmModal()}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add material
            </Button>
          </div>

          {filteredMaterials.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              {masterSearch ? `No materials matching "${masterSearch}"` : 'No raw materials added yet.'}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 touch-scroll">
              <table className="w-full text-left text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-foreground/10 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 font-medium">Material</th>
                    <th className="py-3 font-medium">Unit</th>
                    <th className="py-3 font-medium text-right">Landed</th>
                    <th className="py-3 font-medium text-right">Internal rate</th>
                    <th className="py-3 font-medium text-right">Status</th>
                    <th className="py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map((r) => (
                    <tr key={r.id} className="border-b border-foreground/5">
                      <td className="py-3">
                        <span className="font-medium">{r.displayName}</span>
                        {r.variant && <span className="text-xs text-muted-foreground ml-2">{r.variant}</span>}
                      </td>
                      <td className="py-3 text-muted-foreground">{r.unit}</td>
                      <td className="py-3 text-right tabular-nums text-muted-foreground">{formatINR(r.currentLandedPurchaseRate)}</td>
                      <td className="py-3 text-right tabular-nums font-medium">{formatINR(r.currentInternalSellingRate)}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => updateRawMaterial(r.id, { status: r.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                          className="cursor-pointer"
                        >
                          <Badge variant={r.status === 'ACTIVE' ? 'success' : 'secondary'}>{r.status}</Badge>
                        </button>
                      </td>
                      <td className="py-3 text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => openRmModal(r)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete raw material ${r.displayName}?`)) {
                              deleteRawMaterial(r.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* CUSTOMERS TAB */}
      {activeTab === 'customers' && (
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Customer master</h2>
            <Button size="sm" onClick={() => openCustModal()}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add customer
            </Button>
          </div>

          {filteredCustomers.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              {masterSearch ? `No customers matching "${masterSearch}"` : 'No customers added yet.'}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 touch-scroll">
              <table className="w-full text-left text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-foreground/10 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 font-medium">Customer</th>
                    <th className="py-3 font-medium">Phone</th>
                    <th className="py-3 font-medium">Company</th>
                    <th className="py-3 font-medium">Address</th>
                    <th className="py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c) => (
                    <tr key={c.id} className="border-b border-foreground/5">
                      <td className="py-3 font-medium">{c.name}</td>
                      <td className="py-3 text-muted-foreground">{c.phone || '—'}</td>
                      <td className="py-3 text-muted-foreground">{c.companyName || '—'}</td>
                      <td className="py-3 text-muted-foreground truncate max-w-xs">{c.deliveryAddress || '—'}</td>
                      <td className="py-3 text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => openCustModal(c)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete ${c.name}?`)) deleteCustomer(c.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* SUPPLIERS TAB */}
      {activeTab === 'suppliers' && (
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Supplier Master</h2>
            <Button size="sm" onClick={() => openSupModal()}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Supplier
            </Button>
          </div>

          {filteredSuppliers.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              {masterSearch ? `No suppliers matching "${masterSearch}"` : 'No suppliers added yet.'}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 touch-scroll">
              <table className="w-full text-left text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-foreground/10 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 font-medium">Supplier Name</th>
                    <th className="py-3 font-medium">Phone</th>
                    <th className="py-3 font-medium">Tax / GST</th>
                    <th className="py-3 font-medium">Payment Terms</th>
                    <th className="py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((s) => (
                    <tr key={s.id} className="border-b border-foreground/5">
                      <td className="py-3 font-medium">{s.name}</td>
                      <td className="py-3 text-muted-foreground">{s.phone || '—'}</td>
                      <td className="py-3 text-muted-foreground">{s.taxDetails || '—'}</td>
                      <td className="py-3 text-muted-foreground">{s.paymentTerms || '—'}</td>
                      <td className="py-3 text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => openSupModal(s)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete supplier ${s.name}?`)) deleteSupplier(s.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* GODOWNS & BAGS SETTINGS */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <section className="space-y-4">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Godowns & locations</h2>
            <div className="flex gap-2">
              <Input
                placeholder="New godown name"
                value={godownName}
                onChange={(e) => setGodownName(e.target.value)}
              />
              <Button
                size="sm"
                onClick={() => {
                  if (godownName) {
                    addGodown(godownName);
                    setGodownName('');
                  }
                }}
              >
                Add
              </Button>
            </div>
            <div className="border-t border-foreground/10 pt-2 space-y-2">
              {godowns.map((g) => (
                <div key={g.id} className="flex justify-between items-center py-2 border-b border-foreground/5 text-sm">
                  <span>{g.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateGodown(g.id, { active: !g.active })}
                      className="cursor-pointer"
                    >
                      <Badge variant={g.active ? 'success' : 'secondary'}>
                        {g.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete godown ${g.name}?`)) {
                          deleteGodown(g.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Gift bags & cost rates</h2>
            <div className="border-t border-foreground/10 pt-2 space-y-3">
              {giftBags.map((bg) => (
                <div key={bg.id} className="flex justify-between items-center py-2 border-b border-foreground/5 text-sm">
                  <span className="font-medium">{bg.size} gift bag</span>
                  <div className="flex items-center gap-2">
                    <span>₹</span>
                    <Input
                      type="number"
                      className="w-20 text-right"
                      value={bg.costRate || ''}
                      onChange={(e) => updateGiftBagRate(bg.id, Number(e.target.value) || 0)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* BOX DIALOG */}
      <Dialog open={boxDialogOpen} onOpenChange={setBoxDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBox ? `Edit ${editingBox.boxCode}` : 'New box design'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBox} className="space-y-4 mt-4">
            <div>
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Photo</label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 aspect-square bg-secondary/30 p-1 shrink-0 overflow-hidden flex items-center justify-center">
                  <img src={imageUrl} alt="preview" className="w-full h-full object-contain" />
                </div>
                <label className="flex-1 border border-dashed border-foreground/20 py-3 text-center text-sm text-muted-foreground cursor-pointer hover:border-foreground/40 transition-colors">
                  {uploading ? 'Uploading...' : 'Take photo / upload'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setUploading(true);
                        const url = await compressAndUploadImage(f, 'boxes');
                        setImageUrl(url);
                        setUploading(false);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Box code</label>
                <Input value={boxCode} onChange={(e) => setBoxCode(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Box name</label>
                <Input placeholder="Optional name" value={boxName} onChange={(e) => setBoxName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Landed cost ₹</label>
                <Input type="number" value={landedCost || ''} onChange={(e) => setLandedCost(Number(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Final rate ₹</label>
                <Input type="number" value={finalRate || ''} onChange={(e) => setFinalRate(Number(e.target.value) || 0)} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={uploading}>
              {editingBox ? 'Update box' : 'Save box'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* RAW MATERIAL DIALOG */}
      <Dialog open={rmDialogOpen} onOpenChange={setRmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRm ? `Edit ${editingRm.displayName}` : 'New raw material'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveRm} className="space-y-4 mt-4">
            <div>
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Display name</label>
              <Input placeholder="e.g. Mamra Almonds Special" value={rmName} onChange={(e) => setRmName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Variant / grade</label>
                <Input placeholder="Grade A" value={rmVariant} onChange={(e) => setRmVariant(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Unit</label>
                <select
                  value={rmUnit}
                  onChange={(e) => setRmUnit(e.target.value as 'KG' | 'PCS')}
                  className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none"
                >
                  <option value="KG">KG (Kilograms)</option>
                  <option value="PCS">PCS (Pieces)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Landed purchase rate ₹</label>
                <Input type="number" value={rmLandedRate || ''} onChange={(e) => setRmLandedRate(Number(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Internal selling rate ₹</label>
                <Input type="number" value={rmInternalRate || ''} onChange={(e) => setRmInternalRate(Number(e.target.value) || 0)} />
              </div>
            </div>
            <Button type="submit" className="w-full">
              {editingRm ? 'Update material' : 'Save material'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* CUSTOMER DIALOG */}
      <Dialog open={custDialogOpen} onOpenChange={setCustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCust ? `Edit ${editingCust.name}` : 'New customer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCust} className="space-y-4 mt-4">
            <Input placeholder="Full name *" value={cName} onChange={(e) => setCName(e.target.value)} />
            <Input placeholder="Phone number" value={cPhone} onChange={(e) => setCPhone(e.target.value)} />
            <Input placeholder="Company name (optional)" value={cCompany} onChange={(e) => setCCompany(e.target.value)} />
            <Input placeholder="Delivery address" value={cAddress} onChange={(e) => setCAddress(e.target.value)} />
            <Input placeholder="Notes" value={cNotes} onChange={(e) => setCNotes(e.target.value)} />
            <Button type="submit" className="w-full">
              {editingCust ? 'Update customer' : 'Save customer'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* SUPPLIER DIALOG */}
      <Dialog open={supDialogOpen} onOpenChange={setSupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSup ? `Edit ${editingSup.name}` : 'New Supplier'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSup} className="space-y-4 mt-4">
            <div>
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Supplier Name *</label>
              <Input placeholder="e.g. Royal Dry Fruits Wholesalers" value={sName} onChange={(e) => setSName(e.target.value)} required />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Phone / Mobile</label>
              <Input placeholder="+91 98765 43210" value={sPhone} onChange={(e) => setSPhone(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Tax / GST Details</label>
              <Input placeholder="27AAAAA0000A1Z5" value={sTax} onChange={(e) => setSTax(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Payment Terms</label>
              <Input placeholder="30 Days Credit / Immediate" value={sTerms} onChange={(e) => setSTerms(e.target.value)} />
            </div>
            <Button type="submit" className="w-full">
              {editingSup ? 'Update Supplier' : 'Save Supplier'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
