import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const CustomerInvoice = ({ token }) => {
  const [customers, setCustomers] = useState(() => JSON.parse(localStorage.getItem('customers') || '[]'));
  const [invoices, setInvoices] = useState(() => JSON.parse(localStorage.getItem('invoices') || '[]'));
  const [activeTab, setActiveTab] = useState('customers');
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [invoiceForm, setInvoiceForm] = useState({ customerId: '', items: [{ description: '', qty: 1, rate: '' }], dueDate: '' });
  const [printInvoice, setPrintInvoice] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [selectedCustomerForTx, setSelectedCustomerForTx] = useState('');
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [txInvoiceCustomer, setTxInvoiceCustomer] = useState('');
  const csvInputRef = useRef();

  useEffect(() => { localStorage.setItem('customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem('invoices', JSON.stringify(invoices)); }, [invoices]);

  useEffect(() => {
    if (activeTab !== 'tx-invoice') return;
    setLoadingTransactions(true);
    axios.get('http://localhost:5000/api/ledger', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setTransactions(r.data.entries || r.data || []))
      .catch(() => setTransactions([]))
      .finally(() => setLoadingTransactions(false));
  }, [activeTab, token]);

  const toggleTx = (id) => setSelectedTransactions(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const generateTxInvoice = (mode) => {
    const customer = customers.find(c => c.id === parseInt(txInvoiceCustomer));
    if (!customer) return alert('Select a customer');
    const selected = transactions.filter(t => selectedTransactions.includes(t.id));
    if (!selected.length) return alert('Select at least one transaction');
    const inv = {
      invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleDateString('en-IN'),
      dueDate: '',
      customer,
      customerId: customer.id,
      customerName: customer.name,
      items: selected.map(t => ({ description: `${t.category} – ${t.description || t.entry_type || ''}`, qty: 1, rate: t.amount })),
      total: selected.reduce((s, t) => s + parseFloat(t.amount || 0), 0),
      status: 'Pending',
      id: Date.now()
    };
    setInvoices(prev => [...prev, inv]);
    if (mode === 'print') {
      setPrintInvoice(inv);
      setTimeout(() => window.print(), 300);
    } else {
      setPrintInvoice(inv);
    }
  };

  const addCustomer = (e) => {
    e.preventDefault();
    setCustomers(prev => [...prev, { ...customerForm, id: Date.now() }]);
    setCustomerForm({ name: '', email: '', phone: '', address: '' });
    setShowCustomerForm(false);
  };

  const addInvoice = (e) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === parseInt(invoiceForm.customerId));
    const total = invoiceForm.items.reduce((sum, item) => sum + (item.qty * parseFloat(item.rate || 0)), 0);
    setInvoices(prev => [...prev, {
      ...invoiceForm, id: Date.now(),
      invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
      customerName: customer?.name || '',
      total, date: new Date().toLocaleDateString('en-IN'), status: 'Pending'
    }]);
    setInvoiceForm({ customerId: '', items: [{ description: '', qty: 1, rate: '' }], dueDate: '' });
    setShowInvoiceForm(false);
  };

  const bulkUploadCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const required = ['name', 'email', 'phone', 'address'];
      if (!required.every(r => headers.includes(r))) {
        alert('CSV must have columns: name, email, phone, address');
        return;
      }
      const newCustomers = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return { ...obj, id: Date.now() + Math.random() };
      }).filter(c => c.name);
      setCustomers(prev => [...prev, ...newCustomers]);
      alert(`Imported ${newCustomers.length} customers`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePrint = (inv) => {
    const customer = customers.find(c => c.id === parseInt(inv.customerId)) || { name: inv.customerName, email: '', phone: '', address: '' };
    setPrintInvoice({ ...inv, customer });
    setTimeout(() => window.print(), 300);
  };

  const updateItem = (index, field, value) => {
    const items = [...invoiceForm.items];
    items[index][field] = value;
    setInvoiceForm(prev => ({ ...prev, items }));
  };

  const cardStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '1.5rem', marginBottom: '1rem' };

  if (printInvoice) {
    const subtotal = printInvoice.items.reduce((s, item) => s + (item.qty * parseFloat(item.rate || 0)), 0);
    const gst = subtotal * 0.18;
    const grandTotal = subtotal + gst;
    return (
      <div style={{ background: '#f4f6f9', minHeight: '100vh', padding: '2rem', fontFamily: 'Georgia, serif' }}>
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #print-area, #print-area * { visibility: visible; }
            #print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
            .no-print { display: none !important; }
          }
          @page { margin: 15mm; }
        `}</style>

        {/* Action buttons */}
        <div className="no-print" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setPrintInvoice(null)} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '0.6rem 1.25rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: 'Arial, sans-serif' }}>← Back</button>
          <button onClick={() => window.print()} style={{ background: '#8c2bee', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: 'Arial, sans-serif' }}>🖨 Print / Save PDF</button>
        </div>

        <div id="print-area" style={{ background: 'white', maxWidth: 780, margin: '0 auto', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', borderRadius: 4, overflow: 'hidden', color: '#1a1a2e' }}>

          {/* Header band */}
          <div style={{ background: 'linear-gradient(135deg, #8c2bee, #b347d9)', padding: '2rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: 'white', fontSize: '1.6rem', fontWeight: 700, letterSpacing: 1 }}>FinLedger Pro</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', marginTop: 4 }}>Financial Management & Analytics</div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', marginTop: 2 }}>support@finledgerpro.com · +91 98765 43210</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'white', fontSize: '2rem', fontWeight: 800, letterSpacing: 2 }}>INVOICE</div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', marginTop: 4 }}>{printInvoice.invoiceNo}</div>
            </div>
          </div>

          <div style={{ padding: '2rem 2.5rem' }}>

            {/* Invoice meta + Bill To */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', gap: '2rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8c2bee', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Bill To</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a2e' }}>{printInvoice.customer.name}</div>
                {printInvoice.customer.address && <div style={{ color: '#555', fontSize: '0.85rem', marginTop: 3 }}>{printInvoice.customer.address}</div>}
                {printInvoice.customer.phone && <div style={{ color: '#555', fontSize: '0.85rem', marginTop: 2 }}>📞 {printInvoice.customer.phone}</div>}
                {printInvoice.customer.email && <div style={{ color: '#555', fontSize: '0.85rem', marginTop: 2 }}>✉ {printInvoice.customer.email}</div>}
              </div>
              <div style={{ minWidth: 200 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8c2bee', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Invoice Details</div>
                {[['Invoice No', printInvoice.invoiceNo], ['Issue Date', printInvoice.date], ['Due Date', printInvoice.dueDate || 'On Receipt'], ['Status', printInvoice.status || 'Pending']].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 5 }}>
                    <span style={{ color: '#777' }}>{label}:</span>
                    <span style={{ fontWeight: 600, color: label === 'Status' ? '#f59e0b' : '#1a1a2e' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 2, background: 'linear-gradient(90deg, #8c2bee, #b347d9, #e5e7eb)', borderRadius: 2, marginBottom: '1.5rem' }} />

            {/* Items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8f4ff' }}>
                  {['#', 'Description', 'Qty', 'Unit Rate', 'Amount'].map((h, i) => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: i >= 2 ? 'right' : 'left', color: '#8c2bee', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #e9d5ff' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {printInvoice.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem 1rem', color: '#9ca3af', width: 32 }}>{i + 1}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#1a1a2e' }}>{item.description}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#374151' }}>{item.qty}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#374151' }}>₹{parseFloat(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#1a1a2e' }}>₹{(item.qty * parseFloat(item.rate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
              <div style={{ minWidth: 260 }}>
                {[['Subtotal', subtotal], ['GST (18%)', gst]].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.875rem', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ color: '#6b7280' }}>{label}</span>
                    <span style={{ color: '#374151' }}>₹{val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', marginTop: 6, background: 'linear-gradient(135deg, #8c2bee, #b347d9)', borderRadius: 8 }}>
                  <span style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>Total Due</span>
                  <span style={{ color: 'white', fontWeight: 800, fontSize: '1rem' }}>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#e5e7eb', marginBottom: '1.5rem' }} />

            {/* Payment terms + notes */}
            <div style={{ display: 'flex', gap: '2rem', fontSize: '0.8rem', color: '#6b7280', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#374151', marginBottom: 4 }}>Payment Terms</div>
                <div>Payment is due within 30 days of invoice date.</div>
                <div style={{ marginTop: 4 }}>Bank Transfer / UPI accepted.</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#374151', marginBottom: 4 }}>Notes</div>
                <div>Thank you for your business. Please include the invoice number in your payment reference.</div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ background: '#f8f4ff', borderRadius: 8, padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af' }}>
              FinLedger Pro · This is a computer-generated invoice and does not require a physical signature.
            </div>
          </div>
        </div>
      </div>
    );
  }
  const inputStyle = { width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: '1rem', boxSizing: 'border-box' };
  const btnPrimary = { background: 'linear-gradient(135deg, #8c2bee, #b347d9)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600 };
  const btnSecondary = { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 1.5rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600 };

  return (
    <div style={{ color: 'white' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {['customers', 'invoices', 'tx-invoice'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '0.75rem 2rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, border: 'none',
            background: activeTab === tab ? 'linear-gradient(135deg, #8c2bee, #b347d9)' : 'rgba(255,255,255,0.05)',
            color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.7)'
          }}>
            {tab === 'tx-invoice' ? 'Transaction Invoice' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Customers ({customers.length})</h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={bulkUploadCSV} />
              <button style={btnSecondary} onClick={() => csvInputRef.current.click()}>⬆ Bulk Upload CSV</button>
              <button style={btnPrimary} onClick={() => setShowCustomerForm(!showCustomerForm)}>+ Add Customer</button>
            </div>
          </div>

          {showCustomerForm && (
            <div style={{ ...cardStyle, borderColor: 'rgba(140,43,238,0.3)', marginBottom: '1.5rem' }}>
              <h4 style={{ marginTop: 0 }}>New Customer</h4>
              <form onSubmit={addCustomer}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  {[['name', 'Full Name'], ['email', 'Email'], ['phone', 'Phone'], ['address', 'Address']].map(([field, label]) => (
                    <div key={field}>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>{label}</label>
                      <input required style={inputStyle} value={customerForm[field]} onChange={e => setCustomerForm(p => ({ ...p, [field]: e.target.value }))} placeholder={label} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" style={btnPrimary}>Save Customer</button>
                  <button type="button" style={btnSecondary} onClick={() => setShowCustomerForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {customers.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' }}>No customers yet. Add your first customer.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {customers.map(c => (
                <div key={c.id} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #8c2bee, #b347d9)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.25rem' }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <button onClick={() => setCustomers(prev => prev.filter(x => x.id !== c.id))} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 8, padding: '0.25rem 0.75rem', cursor: 'pointer' }}>Remove</button>
                  </div>
                  <h4 style={{ margin: '1rem 0 0.25rem' }}>{c.name}</h4>
                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0.25rem 0', fontSize: '0.875rem' }}>{c.email}</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0.25rem 0', fontSize: '0.875rem' }}>{c.phone}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transaction Invoice Tab */}
      {activeTab === 'tx-invoice' && (
        <div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <select
              style={{ ...inputStyle, width: 220, color: 'white' }}
              value={txInvoiceCustomer}
              onChange={e => { setTxInvoiceCustomer(e.target.value); setSelectedTransactions([]); }}
            >
              <option value="" style={{ background: '#1a1a2e', color: 'white' }}>Select Customer</option>
              {customers.map(c => <option key={c.id} value={c.id} style={{ background: '#1a1a2e', color: 'white' }}>{c.name}</option>)}
            </select>
            <button style={btnPrimary} onClick={() => generateTxInvoice('view')}>Generate Invoice</button>
            <button style={btnSecondary} onClick={() => generateTxInvoice('print')}>🖨 Print</button>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{selectedTransactions.length} selected</span>
          </div>

          {loadingTransactions ? (
            <div style={{ color: 'rgba(255,255,255,0.5)', padding: '2rem' }}>Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' }}>No transactions found.</div>
          ) : (
            <div style={cardStyle}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['', 'Date', 'Description', 'Category', 'Amount', 'Status'].map(h => (
                      <th key={h} style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, textAlign: 'left', padding: '0.75rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id} style={{ background: selectedTransactions.includes(t.id) ? 'rgba(140,43,238,0.1)' : 'transparent' }}>
                      <td style={{ padding: '0.6rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <input type="checkbox" checked={selectedTransactions.includes(t.id)} onChange={() => toggleTx(t.id)} style={{ cursor: 'pointer', width: 16, height: 16 }} />
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{t.date || t.created_at?.split('T')[0]}</td>
                      <td style={{ padding: '0.6rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{t.description || t.entry_type || '—'}</td>
                      <td style={{ padding: '0.6rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)' }}>{t.category}</td>
                      <td style={{ padding: '0.6rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#10b981', fontWeight: 600 }}>₹{parseFloat(t.amount || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '0.6rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ background: t.is_anomaly ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: t.is_anomaly ? '#ef4444' : '#10b981', padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                          {t.is_anomaly ? 'Anomaly' : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Invoices ({invoices.length})</h3>
            <button style={btnPrimary} onClick={() => setShowInvoiceForm(!showInvoiceForm)} disabled={customers.length === 0}>+ New Invoice</button>
          </div>

          {customers.length === 0 && <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>Add customers first to create invoices.</div>}

          {showInvoiceForm && (
            <div style={{ ...cardStyle, borderColor: 'rgba(140,43,238,0.3)', marginBottom: '1.5rem' }}>
              <h4 style={{ marginTop: 0 }}>New Invoice</h4>
              <form onSubmit={addInvoice}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Customer</label>
                    <select required style={{ ...inputStyle, appearance: 'none' }} value={invoiceForm.customerId} onChange={e => setInvoiceForm(p => ({ ...p, customerId: e.target.value }))}>
                      <option value="">Select Customer</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Due Date</label>
                    <input type="date" required style={inputStyle} value={invoiceForm.dueDate} onChange={e => setInvoiceForm(p => ({ ...p, dueDate: e.target.value }))} />
                  </div>
                </div>

                <h5 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.75rem' }}>Items</h5>
                {invoiceForm.items.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr auto', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                    <input placeholder="Description" style={inputStyle} value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} required />
                    <input type="number" placeholder="Qty" style={inputStyle} value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} min="1" required />
                    <input type="number" placeholder="Rate (₹)" style={inputStyle} value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} required />
                    <button type="button" onClick={() => setInvoiceForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 8, padding: '0.75rem', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
                <button type="button" style={{ ...btnSecondary, marginBottom: '1rem' }} onClick={() => setInvoiceForm(p => ({ ...p, items: [...p.items, { description: '', qty: 1, rate: '' }] }))}>+ Add Item</button>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" style={btnPrimary}>Create Invoice</button>
                  <button type="button" style={btnSecondary} onClick={() => setShowInvoiceForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {invoices.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' }}>No invoices yet.</div>
          ) : (
            <div style={cardStyle}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Invoice No', 'Customer', 'Date', 'Due Date', 'Total', 'Status', ''].map(h => (
                      <th key={h} style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, textAlign: 'left', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#8c2bee', fontWeight: 600 }}>{inv.invoiceNo}</td>
                      <td style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{inv.customerName}</td>
                      <td style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)' }}>{inv.date}</td>
                      <td style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)' }}>{inv.dueDate}</td>
                      <td style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#10b981', fontWeight: 600 }}>₹{inv.total.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ background: 'rgba(234,179,8,0.2)', color: '#eab308', padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>{inv.status}</span>
                      </td>
                      <td style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <button onClick={() => handlePrint(inv)} style={{ background: 'rgba(140,43,238,0.15)', border: '1px solid rgba(140,43,238,0.3)', color: '#b347d9', borderRadius: 8, padding: '0.25rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}>🖨 Print</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerInvoice;
