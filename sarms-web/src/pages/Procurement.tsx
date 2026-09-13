import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

export function Procurement() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [vendorForm, setVendorForm] = useState({ name: '' });
  const [poForm, setPoForm] = useState({
    vendorId: '', departmentId: '', description: '', categoryId: '', quantity: '1', unitCost: '',
  });

  const load = () => {
    api.get('/vendors').then((res) => setVendors(res.data));
    api.get('/purchase-orders').then((res) => setOrders(res.data));
  };

  useEffect(() => {
    load();
    api.get('/departments').then((res) => setDepartments(res.data));
    api.get('/asset-categories').then((res) => setCategories(res.data));
  }, []);

  const addVendor = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/vendors', vendorForm);
      setVendorForm({ name: '' });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not add vendor.');
    }
  };

  const createPo = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/purchase-orders', {
        vendorId: Number(poForm.vendorId),
        departmentId: Number(poForm.departmentId),
        items: [{
          description: poForm.description,
          categoryId: poForm.categoryId ? Number(poForm.categoryId) : undefined,
          quantity: Number(poForm.quantity),
          unitCost: Number(poForm.unitCost),
        }],
      });
      setPoForm({ vendorId: '', departmentId: '', description: '', categoryId: '', quantity: '1', unitCost: '' });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not create purchase order.');
    }
  };

  const receiveItem = async (poId: number, poItemId: number, owningDepartmentId: number) => {
    setError(null);
    try {
      await api.post(`/purchase-orders/${poId}/receive`, { poItemId, owningDepartmentId });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not receive items.');
    }
  };

  const inputClass = 'h-11 rounded border border-border px-3 text-sm w-full';
  const labelClass = 'text-sm font-medium text-text-primary mb-1 block';

  return (
    <div className="flex flex-col gap-8">
      {error && <div className="rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h1 className="text-xl font-semibold text-text-primary mb-4">Add Vendor</h1>
          <form onSubmit={addVendor} className="bg-white rounded-lg border border-border shadow-card p-6 flex gap-3">
            <input required placeholder="Vendor name" className={inputClass} value={vendorForm.name} onChange={(e) => setVendorForm({ name: e.target.value })} />
            <button type="submit" className="px-4 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover shrink-0">Add</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {vendors.map((v) => (
              <span key={v.id} className="text-xs bg-soft-accent text-primary px-2.5 py-1 rounded-full">{v.name}</span>
            ))}
          </div>
        </div>

        <div>
          <h1 className="text-xl font-semibold text-text-primary mb-4">New Purchase Order</h1>
          <form onSubmit={createPo} className="bg-white rounded-lg border border-border shadow-card p-6 flex flex-col gap-3">
            <div>
              <label className={labelClass}>Vendor</label>
              <select required className={inputClass} value={poForm.vendorId} onChange={(e) => setPoForm((f) => ({ ...f, vendorId: e.target.value }))}>
                <option value="">Select…</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Department</label>
              <select required className={inputClass} value={poForm.departmentId} onChange={(e) => setPoForm((f) => ({ ...f, departmentId: e.target.value }))}>
                <option value="">Select…</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Item Description</label>
              <input required className={inputClass} value={poForm.description} onChange={(e) => setPoForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Asset Category (for receiving later)</label>
              <select className={inputClass} value={poForm.categoryId} onChange={(e) => setPoForm((f) => ({ ...f, categoryId: e.target.value }))}>
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Quantity</label>
                <input required type="number" min="1" className={inputClass} value={poForm.quantity} onChange={(e) => setPoForm((f) => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Unit Cost</label>
                <input required type="number" min="0" step="0.01" className={inputClass} value={poForm.unitCost} onChange={(e) => setPoForm((f) => ({ ...f, unitCost: e.target.value }))} />
              </div>
            </div>
            <button type="submit" className="h-11 rounded bg-primary text-white font-medium hover:bg-primary-hover">Create Purchase Order</button>
          </form>
        </div>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-text-primary mb-4">Purchase Orders</h1>
        <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
          {orders.length === 0 && <div className="px-5 py-4 text-sm text-text-secondary">No purchase orders yet.</div>}
          {orders.map((po) => (
            <div key={po.id} className="px-5 py-4 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-text-primary">{po.poNumber} — {po.vendor?.name}</div>
                  <div className="text-text-secondary text-xs">{po.department?.name} • {po.status}</div>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-soft-accent text-primary">{po.status}</span>
              </div>
              {po.status !== 'RECEIVED' && (
                <div className="mt-3 flex flex-col gap-2">
                  {po.items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between bg-canvas rounded px-3 py-2">
                      <span>{item.quantity}x {item.description}</span>
                      <button
                        disabled={!item.categoryId}
                        title={!item.categoryId ? 'This item has no asset category set' : ''}
                        onClick={() => receiveItem(po.id, item.id, po.departmentId)}
                        className="text-xs font-medium text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                      >
                        Receive as assets
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
