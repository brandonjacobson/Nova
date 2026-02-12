'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import './CreateInvoice.css';

const CreateInvoice = () => {
  const { user } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    dueDate: '',
    notes: '',
    // Multi-chain payment options
    paymentOptions: {
      allowBtc: true,
      allowEth: true,
      allowSol: true,
    },
    settlementTarget: 'USD',
    lineItems: [
      { description: '', quantity: 1, unitPriceCents: 0 },
    ],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Calculate totals
  const calculateLineItemAmount = (item) => {
    return item.quantity * item.unitPriceCents;
  };

  const subtotal = formData.lineItems.reduce((sum, item) => sum + calculateLineItemAmount(item), 0);
  const taxRate = 0; // No tax for now
  const taxCents = Math.round(subtotal * taxRate);
  const totalCents = subtotal + taxCents;

  // Format currency for display
  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const inferConversionMode = (paymentOptions, settlementTarget) => {
    if (settlementTarget === 'USD') return 'MODE_A';
    const enabledChains = [];
    if (paymentOptions?.allowBtc) enabledChains.push('BTC');
    if (paymentOptions?.allowEth) enabledChains.push('ETH');
    if (paymentOptions?.allowSol) enabledChains.push('SOL');
    if (enabledChains.length === 1 && enabledChains[0] === settlementTarget) {
      return 'MODE_B';
    }
    return 'MODE_A';
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle line item changes
  const handleLineItemChange = (index, field, value) => {
    const newLineItems = [...formData.lineItems];
    if (field === 'quantity') {
      newLineItems[index][field] = parseInt(value) || 0;
    } else if (field === 'unitPriceCents') {
      // Convert dollars to cents
      newLineItems[index][field] = Math.round(parseFloat(value) * 100) || 0;
    } else {
      newLineItems[index][field] = value;
    }
    setFormData(prev => ({ ...prev, lineItems: newLineItems }));
  };

  // Add new line item
  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: '', quantity: 1, unitPriceCents: 0 }],
    }));
  };

  // Remove line item
  const removeLineItem = (index) => {
    if (formData.lineItems.length === 1) return;
    const newLineItems = formData.lineItems.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, lineItems: newLineItems }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!formData.clientName || !formData.clientEmail) {
      setError('Client name and email are required');
      return;
    }

    if (formData.lineItems.some(item => !item.description || item.unitPriceCents <= 0)) {
      setError('All line items must have a description and price');
      return;
    }

    // Validate at least one payment option is selected
    const hasPaymentOption =
      formData.paymentOptions.allowBtc ||
      formData.paymentOptions.allowEth ||
      formData.paymentOptions.allowSol;
    if (!hasPaymentOption) {
      setError('At least one payment option must be selected');
      return;
    }

    setIsSubmitting(true);

    try {
      // Default due date to 30 days from now if not provided
      const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const invoiceData = {
        invoiceNumber: formData.invoiceNumber?.trim() || undefined,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientAddress: formData.clientAddress,
        dueDate: formData.dueDate || defaultDueDate,
        notes: formData.notes,
        // Multi-chain payment options
        paymentOptions: formData.paymentOptions,
        settlementTarget: formData.settlementTarget,
        conversionMode: inferConversionMode(formData.paymentOptions, formData.settlementTarget),
        items: formData.lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPriceCents,
        })),
      };

      const result = await api.invoices.create(invoiceData);
      router.push(`/invoices/${result.data._id}`);
    } catch (err) {
      console.error('Failed to create invoice:', err);
      setError(err.message || 'Failed to create invoice');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-invoice-page">
      {/* Sidebar */}
      <Sidebar user={user} />

      {/* Main Content */}
      <main className="main-content">
        <header className="content-header">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <button className="back-btn" onClick={() => router.push('/invoices')}>
              ← Back to Invoices
            </button>
            <h1 className="page-title">Create Invoice</h1>
            <p className="page-subtitle">Create a new invoice for your client</p>
          </motion.div>
        </header>

        <form className="invoice-form" onSubmit={handleSubmit}>
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          {/* Client Information */}
          <section className="form-section">
            <h2 className="section-title">Client Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="clientName">Client Name *</label>
                <input
                  type="text"
                  id="clientName"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  placeholder="Acme Corporation"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label htmlFor="clientEmail">Client Email *</label>
                <input
                  type="email"
                  id="clientEmail"
                  name="clientEmail"
                  value={formData.clientEmail}
                  onChange={handleChange}
                  placeholder="billing@acme.com"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group full-width">
                <label htmlFor="clientAddress">Client Address</label>
                <input
                  type="text"
                  id="clientAddress"
                  name="clientAddress"
                  value={formData.clientAddress}
                  onChange={handleChange}
                  placeholder="123 Main St, City, State 12345"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </section>

          {/* Invoice Details */}
          <section className="form-section">
            <h2 className="section-title">Invoice Details</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="invoiceNumber">Invoice Number (optional)</label>
                <input
                  type="text"
                  id="invoiceNumber"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleChange}
                  placeholder="Leave blank to auto-generate"
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label htmlFor="dueDate">Due Date</label>
                <input
                  type="date"
                  id="dueDate"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label htmlFor="settlementTarget">Settlement Target</label>
                <select
                  id="settlementTarget"
                  name="settlementTarget"
                  value={formData.settlementTarget}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="USD">USD (Fiat)</option>
                  <option value="BTC">BTC (Bitcoin)</option>
                  <option value="ETH">ETH (Ethereum)</option>
                  <option value="SOL">SOL (Solana)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Payment Options */}
          <section className="form-section">
            <h2 className="section-title">Payment Options</h2>
            <p className="section-subtitle">Select which cryptocurrencies clients can pay with</p>

            <div className="payment-options-grid">
              <label className={`chain-option ${formData.paymentOptions.allowBtc ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={formData.paymentOptions.allowBtc}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paymentOptions: { ...prev.paymentOptions, allowBtc: e.target.checked }
                  }))}
                  disabled={isSubmitting}
                />
                <span className="chain-icon btc">₿</span>
                <span className="chain-name">Bitcoin</span>
                <span className="chain-symbol">BTC</span>
              </label>

              <label className={`chain-option ${formData.paymentOptions.allowEth ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={formData.paymentOptions.allowEth}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paymentOptions: { ...prev.paymentOptions, allowEth: e.target.checked }
                  }))}
                  disabled={isSubmitting}
                />
                <span className="chain-icon eth">Ξ</span>
                <span className="chain-name">Ethereum</span>
                <span className="chain-symbol">ETH</span>
              </label>

              <label className={`chain-option ${formData.paymentOptions.allowSol ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={formData.paymentOptions.allowSol}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paymentOptions: { ...prev.paymentOptions, allowSol: e.target.checked }
                  }))}
                  disabled={isSubmitting}
                />
                <span className="chain-icon sol">◎</span>
                <span className="chain-name">Solana</span>
                <span className="chain-symbol">SOL</span>
              </label>
            </div>

          </section>

          {/* Line Items */}
          <section className="form-section">
            <div className="section-header">
              <h2 className="section-title">Line Items</h2>
              <button
                type="button"
                className="add-item-btn"
                onClick={addLineItem}
                disabled={isSubmitting}
              >
                + Add Item
              </button>
            </div>

            <div className="line-items-table">
              <div className="line-items-header">
                <div className="li-col description">Description</div>
                <div className="li-col quantity">Qty</div>
                <div className="li-col price">Unit Price</div>
                <div className="li-col amount">Amount</div>
                <div className="li-col actions"></div>
              </div>

              {formData.lineItems.map((item, index) => (
                <div key={index} className="line-item-row">
                  <div className="li-col description">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                      placeholder="Service or product description"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="li-col quantity">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="li-col price">
                    <div className="price-input">
                      <span className="currency-symbol">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={(item.unitPriceCents / 100).toFixed(2)}
                        onChange={(e) => handleLineItemChange(index, 'unitPriceCents', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="li-col amount">
                    {formatCurrency(calculateLineItemAmount(item))}
                  </div>
                  <div className="li-col actions">
                    {formData.lineItems.length > 1 && (
                      <button
                        type="button"
                        className="remove-item-btn"
                        onClick={() => removeLineItem(index)}
                        disabled={isSubmitting}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="totals-section">
              <div className="total-row">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="total-row">
                <span>Tax</span>
                <span>{formatCurrency(taxCents)}</span>
              </div>
              <div className="total-row total-final">
                <span>Total</span>
                <span>{formatCurrency(totalCents)}</span>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="form-section">
            <h2 className="section-title">Notes</h2>
            <div className="form-group full-width">
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Additional notes or payment instructions..."
                rows={4}
                disabled={isSubmitting}
              />
            </div>
          </section>

          {/* Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="action-btn secondary"
              onClick={() => router.push('/invoices')}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              className="action-btn primary"
              whileHover={!isSubmitting ? { scale: 1.02 } : {}}
              whileTap={!isSubmitting ? { scale: 0.98 } : {}}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" />
                  Creating...
                </>
              ) : (
                'Create Invoice'
              )}
            </motion.button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateInvoice;
