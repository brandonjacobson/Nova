'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import './InvoiceDetail.css';

const STATUS_COLORS = {
  DRAFT: 'status-draft',
  SENT: 'status-sent',
  PENDING: 'status-pending',
  PAID_DETECTED: 'status-paid',
  CONVERTING: 'status-converting',
  SETTLING: 'status-settling',
  CASHED_OUT: 'status-cashed',
  COMPLETE: 'status-complete',
  CANCELLED: 'status-cancelled',
  FAILED: 'status-failed',
};

const STATUS_LABELS = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PENDING: 'Pending',
  PAID_DETECTED: 'Paid',
  CONVERTING: 'Converting',
  SETTLING: 'Settling',
  CASHED_OUT: 'Cashed Out',
  COMPLETE: 'Complete',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
};

const CHAIN_INFO = {
  BTC: { name: 'Bitcoin', symbol: '₿', color: '#f7931a' },
  ETH: { name: 'Ethereum', symbol: 'Ξ', color: '#627eea' },
  SOL: { name: 'Solana', symbol: '◎', color: '#14f195' },
};

const InvoiceDetail = () => {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id;

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [selectedSimChain, setSelectedSimChain] = useState('SOL');
  const [isEditing, setIsEditing] = useState(false);
  const [draftForm, setDraftForm] = useState(null);

  // Format currency
  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  const buildDraftForm = (invoiceData) => {
    if (!invoiceData) return null;
    const initialItems = (invoiceData.items || []).map((item) => ({
      description: item.description || '',
      quantity: item.quantity || 1,
      unitPriceCents: item.unitPrice || 0,
    }));
    return {
      clientName: invoiceData.clientName || '',
      clientEmail: invoiceData.clientEmail || '',
      clientAddress: invoiceData.clientAddress || '',
      dueDate: formatDateInput(invoiceData.dueDate),
      notes: invoiceData.notes || '',
      paymentOptions: {
        allowBtc: invoiceData.paymentOptions?.allowBtc ?? true,
        allowEth: invoiceData.paymentOptions?.allowEth ?? true,
        allowSol: invoiceData.paymentOptions?.allowSol ?? true,
      },
      settlementTarget: invoiceData.settlementTarget || 'USD',
      conversionMode: invoiceData.conversionMode || 'MODE_A',
      lineItems: initialItems.length ? initialItems : [{ description: '', quantity: 1, unitPriceCents: 0 }],
    };
  };
  // Fetch invoice
  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const data = await api.invoices.get(invoiceId);
      setInvoice(data.data);
      setError(null);
      if (data.data?.status === 'DRAFT' && !isEditing) {
        setDraftForm(buildDraftForm(data.data));
      }
    } catch (err) {
      console.error('Failed to fetch invoice:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pipeline status
  const fetchPipelineStatus = async () => {
    try {
      const data = await api.invoices.getPipelineStatus(invoiceId);
      if (data.success) {
        setPipelineStatus(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch pipeline status:', err);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  useEffect(() => {
    if (!invoice?.paymentOptions) return;
    const defaultChain = invoice.paymentOptions.allowSol
      ? 'SOL'
      : invoice.paymentOptions.allowEth
        ? 'ETH'
        : invoice.paymentOptions.allowBtc
          ? 'BTC'
          : 'SOL';
    const isCurrentAllowed =
      (selectedSimChain === 'SOL' && invoice.paymentOptions.allowSol) ||
      (selectedSimChain === 'ETH' && invoice.paymentOptions.allowEth) ||
      (selectedSimChain === 'BTC' && invoice.paymentOptions.allowBtc);
    if (!isCurrentAllowed) {
      setSelectedSimChain(defaultChain);
    }
  }, [invoice?.paymentOptions, selectedSimChain]);

  const calculateDraftTotals = () => {
    if (!draftForm?.lineItems) return { subtotal: 0, tax: 0, total: 0 };
    const subtotal = draftForm.lineItems.reduce((sum, item) => {
      return sum + (item.quantity || 0) * (item.unitPriceCents || 0);
    }, 0);
    const tax = 0;
    return { subtotal, tax, total: subtotal + tax };
  };

  // Poll pipeline status when invoice is processing
  useEffect(() => {
    if (!invoice) return;
    const processingStatuses = ['PAID_DETECTED', 'CONVERTING', 'SETTLING', 'CASHED_OUT'];
    if (!processingStatuses.includes(invoice.status)) return;

    fetchPipelineStatus();
    const interval = setInterval(fetchPipelineStatus, 3000);
    return () => clearInterval(interval);
  }, [invoice?.status, invoiceId]);

  // Action handlers
  const handleEditDraft = () => {
    setIsEditing(true);
    setDraftForm(buildDraftForm(invoice));
    setActionMessage(null);
  };

  const handleDraftFieldChange = (field, value) => {
    setDraftForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDraftItemChange = (index, field, value) => {
    setDraftForm((prev) => {
      const nextItems = [...(prev?.lineItems || [])];
      const current = nextItems[index] || {};
      if (field === 'quantity') {
        nextItems[index] = { ...current, quantity: parseInt(value, 10) || 0 };
      } else if (field === 'unitPriceCents') {
        nextItems[index] = { ...current, unitPriceCents: Math.round(parseFloat(value) * 100) || 0 };
      } else {
        nextItems[index] = { ...current, [field]: value };
      }
      return { ...prev, lineItems: nextItems };
    });
  };

  const handleAddDraftItem = () => {
    setDraftForm((prev) => ({
      ...prev,
      lineItems: [...(prev?.lineItems || []), { description: '', quantity: 1, unitPriceCents: 0 }],
    }));
  };

  const handleRemoveDraftItem = (index) => {
    setDraftForm((prev) => {
      const nextItems = (prev?.lineItems || []).filter((_, i) => i !== index);
      return { ...prev, lineItems: nextItems.length ? nextItems : [{ description: '', quantity: 1, unitPriceCents: 0 }] };
    });
  };

  const handleSaveDraft = async () => {
    setActionLoading('save');
    setActionMessage(null);

    const hasPaymentOption =
      draftForm?.paymentOptions?.allowBtc ||
      draftForm?.paymentOptions?.allowEth ||
      draftForm?.paymentOptions?.allowSol;
    if (!draftForm?.clientName || !draftForm?.dueDate || !hasPaymentOption) {
      setActionLoading(null);
      setActionMessage({ type: 'error', text: 'Client name, due date, and at least one payment option are required.' });
      return;
    }
    if (!draftForm.lineItems?.length || draftForm.lineItems.some(item => !item.description || item.unitPriceCents <= 0)) {
      setActionLoading(null);
      setActionMessage({ type: 'error', text: 'All line items must have a description and price.' });
      return;
    }

    try {
      const payload = {
        clientName: draftForm.clientName,
        clientEmail: draftForm.clientEmail,
        clientAddress: draftForm.clientAddress,
        dueDate: draftForm.dueDate,
        notes: draftForm.notes,
        paymentOptions: draftForm.paymentOptions,
        settlementTarget: draftForm.settlementTarget,
        conversionMode: inferConversionMode(draftForm.paymentOptions, draftForm.settlementTarget),
        items: draftForm.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPriceCents,
        })),
      };
      const result = await api.invoices.update(invoiceId, payload);
      setInvoice(result.data);
      setIsEditing(false);
      setActionMessage({ type: 'success', text: 'Draft saved.' });
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSend = async () => {
    setActionLoading('send');
    setActionMessage(null);
    try {
      const result = await api.invoices.send(invoiceId);
      setInvoice(result.data?.invoice);
      setActionMessage({ type: 'success', text: 'Invoice sent successfully!' });
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckPayment = async () => {
    setActionLoading('check');
    setActionMessage(null);
    try {
      const result = await api.invoices.checkPayment(invoiceId);
      if (result.data?.paid) {
        await fetchInvoice();
        setActionMessage({ type: 'success', text: 'Payment confirmed!' });
      } else {
        await fetchInvoice();
        setActionMessage({ type: 'info', text: 'No payment found yet.' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSimulatePayment = async () => {
    setActionLoading('simulate');
    setActionMessage(null);
    try {
      const result = await api.invoices.simulatePayment(invoiceId, selectedSimChain);
      if (result.success) {
        setActionMessage({ type: 'success', text: `Payment simulated on ${selectedSimChain}! Tx: ${result.data.txHash.slice(0, 16)}...` });
        // Refresh invoice after a moment
        setTimeout(() => {
          fetchInvoice();
          fetchPipelineStatus();
        }, 1000);
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this invoice?')) return;
    setActionLoading('cancel');
    setActionMessage(null);
    try {
      const result = await api.invoices.cancel(invoiceId);
      setInvoice(result.data);
      setActionMessage({ type: 'success', text: 'Invoice cancelled.' });
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this invoice? This cannot be undone.')) return;
    setActionLoading('delete');
    try {
      await api.invoices.delete(invoiceId);
      router.push('/invoices');
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
      setActionLoading(null);
    }
  };

  const handleCopyPaymentUrl = () => {
    if (invoice?.solanaPayUrl) {
      navigator.clipboard.writeText(invoice.solanaPayUrl);
      setActionMessage({ type: 'success', text: 'Payment URL copied!' });
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  // Show loading
  if (loading) {
    return (
      <div className="invoice-detail-page">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Loading invoice...</p>
          </div>
        </main>
      </div>
    );
  }

  // Show error
  if (error) {
    return (
      <div className="invoice-detail-page">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="error-container">
            <p>Error: {error}</p>
            <button onClick={() => router.push('/invoices')} className="action-btn secondary">
              Back to Invoices
            </button>
          </div>
        </main>
      </div>
    );
  }

  const canCheckPayment = ['SENT', 'PENDING'].includes(invoice?.status);
  const canCancel = ['SENT', 'PENDING'].includes(invoice?.status);
  const canDelete = invoice?.status === 'DRAFT';
  const isDraft = invoice?.status === 'DRAFT';
  const showQR = ['SENT', 'PENDING'].includes(invoice?.status) && invoice?.solanaPayUrl;
  const draftTotals = calculateDraftTotals();

  return (
    <div className="invoice-detail-page">
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
            <div className="header-row">
              <div>
                <h1 className="page-title">Invoice {invoice?.invoiceNumber}</h1>
                <p className="page-subtitle">
                  Created {formatDate(invoice?.createdAt)}
                </p>
              </div>
              <span className={`status-badge large ${STATUS_COLORS[invoice?.status]}`}>
                {STATUS_LABELS[invoice?.status] || invoice?.status}
              </span>
            </div>
          </motion.div>
        </header>

        {/* Action Message */}
        {actionMessage && (
          <div className={`action-message ${actionMessage.type}`}>
            {actionMessage.text}
          </div>
        )}

        <div className="detail-layout">
          {/* Invoice Info */}
          <div className="invoice-info">
            {/* Client Section */}
            <section className="info-section">
              <h2 className="section-title">Client</h2>
              <div className="info-card">
                <div className="info-row">
                  <span className="info-label">Name</span>
                  {isEditing && isDraft ? (
                    <input
                      className="edit-input"
                      type="text"
                      value={draftForm?.clientName || ''}
                      onChange={(e) => handleDraftFieldChange('clientName', e.target.value)}
                    />
                  ) : (
                    <span className="info-value">{invoice?.clientName}</span>
                  )}
                </div>
                <div className="info-row">
                  <span className="info-label">Email</span>
                  {isEditing && isDraft ? (
                    <input
                      className="edit-input"
                      type="email"
                      value={draftForm?.clientEmail || ''}
                      onChange={(e) => handleDraftFieldChange('clientEmail', e.target.value)}
                    />
                  ) : (
                    <span className="info-value">{invoice?.clientEmail}</span>
                  )}
                </div>
                {(isEditing && isDraft) || invoice?.clientAddress ? (
                  <div className="info-row">
                    <span className="info-label">Address</span>
                    {isEditing && isDraft ? (
                      <input
                        className="edit-input"
                        type="text"
                        value={draftForm?.clientAddress || ''}
                        onChange={(e) => handleDraftFieldChange('clientAddress', e.target.value)}
                      />
                    ) : (
                      <span className="info-value">{invoice?.clientAddress}</span>
                    )}
                  </div>
                ) : null}
              </div>
            </section>

            {/* Details Section */}
            <section className="info-section">
              <h2 className="section-title">Details</h2>
              <div className="info-card">
                <div className="info-row">
                  <span className="info-label">Issue Date</span>
                  <span className="info-value">{formatDate(invoice?.issueDate)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Due Date</span>
                  {isEditing && isDraft ? (
                    <input
                      className="edit-input"
                      type="date"
                      value={draftForm?.dueDate || ''}
                      onChange={(e) => handleDraftFieldChange('dueDate', e.target.value)}
                    />
                  ) : (
                    <span className="info-value">{formatDate(invoice?.dueDate)}</span>
                  )}
                </div>
                <div className="info-row">
                  <span className="info-label">Settlement Target</span>
                  {isEditing && isDraft ? (
                    <select
                      className="edit-select"
                      value={draftForm?.settlementTarget || 'USD'}
                      onChange={(e) => handleDraftFieldChange('settlementTarget', e.target.value)}
                    >
                      <option value="USD">USD</option>
                      <option value="BTC">BTC</option>
                      <option value="ETH">ETH</option>
                      <option value="SOL">SOL</option>
                    </select>
                  ) : (
                    <span className="info-value">{invoice?.settlementTarget || 'USD'}</span>
                  )}
                </div>
                <div className="info-row">
                  <span className="info-label">Conversion Mode</span>
                  <span className="info-value">
                    {isEditing && isDraft
                      ? inferConversionMode(draftForm?.paymentOptions, draftForm?.settlementTarget) === 'MODE_B'
                        ? 'Receive In-Kind'
                        : 'Convert & Settle'
                      : invoice?.conversionMode === 'MODE_B'
                        ? 'Receive In-Kind'
                        : 'Convert & Settle'}
                  </span>
                </div>
                {invoice?.paidAt && (
                  <div className="info-row">
                    <span className="info-label">Paid At</span>
                    <span className="info-value positive">{formatDate(invoice.paidAt)}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Payment Options Section */}
            {invoice?.paymentOptions && (
              <section className="info-section">
                <h2 className="section-title">Accepted Payment Methods</h2>
                {isEditing && isDraft ? (
                  <div className="payment-chains edit-chains">
                    <label className="chain-toggle">
                      <input
                        type="checkbox"
                        checked={draftForm?.paymentOptions?.allowBtc || false}
                        onChange={(e) => handleDraftFieldChange('paymentOptions', {
                          ...draftForm.paymentOptions,
                          allowBtc: e.target.checked,
                        })}
                      />
                      <span className="chain-badge btc">
                        <span className="chain-symbol">₿</span> BTC
                      </span>
                    </label>
                    <label className="chain-toggle">
                      <input
                        type="checkbox"
                        checked={draftForm?.paymentOptions?.allowEth || false}
                        onChange={(e) => handleDraftFieldChange('paymentOptions', {
                          ...draftForm.paymentOptions,
                          allowEth: e.target.checked,
                        })}
                      />
                      <span className="chain-badge eth">
                        <span className="chain-symbol">Ξ</span> ETH
                      </span>
                    </label>
                    <label className="chain-toggle">
                      <input
                        type="checkbox"
                        checked={draftForm?.paymentOptions?.allowSol || false}
                        onChange={(e) => handleDraftFieldChange('paymentOptions', {
                          ...draftForm.paymentOptions,
                          allowSol: e.target.checked,
                        })}
                      />
                      <span className="chain-badge sol">
                        <span className="chain-symbol">◎</span> SOL
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="payment-chains">
                    {invoice.paymentOptions.allowBtc && (
                      <div className="chain-badge btc">
                        <span className="chain-symbol">₿</span> BTC
                      </div>
                    )}
                    {invoice.paymentOptions.allowEth && (
                      <div className="chain-badge eth">
                        <span className="chain-symbol">Ξ</span> ETH
                      </div>
                    )}
                    {invoice.paymentOptions.allowSol && (
                      <div className="chain-badge sol">
                        <span className="chain-symbol">◎</span> SOL
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Deposit Addresses Section - Show when SENT/PENDING */}
            {['SENT', 'PENDING'].includes(invoice?.status) && invoice?.depositAddresses && (
              <section className="info-section">
                <h2 className="section-title">Deposit Addresses</h2>
                <div className="deposit-addresses">
                  {invoice.depositAddresses.btc && invoice.paymentOptions?.allowBtc && (
                    <div className="address-row">
                      <div className="address-chain">
                        <span className="chain-icon btc">₿</span>
                        <span>Bitcoin</span>
                      </div>
                      <code className="address-value">{invoice.depositAddresses.btc}</code>
                    </div>
                  )}
                  {invoice.depositAddresses.eth && invoice.paymentOptions?.allowEth && (
                    <div className="address-row">
                      <div className="address-chain">
                        <span className="chain-icon eth">Ξ</span>
                        <span>Ethereum</span>
                      </div>
                      <code className="address-value">{invoice.depositAddresses.eth}</code>
                    </div>
                  )}
                  {invoice.depositAddresses.sol && invoice.paymentOptions?.allowSol && (
                    <div className="address-row">
                      <div className="address-chain">
                        <span className="chain-icon sol">◎</span>
                        <span>Solana</span>
                      </div>
                      <code className="address-value">{invoice.depositAddresses.sol}</code>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Line Items */}
            <section className="info-section">
              <h2 className="section-title">Line Items</h2>
              {isEditing && isDraft ? (
                <div className="line-items-card edit-line-items">
                  <div className="line-items-header">
                    <span>Description</span>
                    <span>Qty</span>
                    <span>Price</span>
                    <span>Amount</span>
                  </div>
                  {(draftForm?.lineItems || []).map((item, index) => (
                    <div key={index} className="line-item-row">
                      <input
                        className="edit-input"
                        type="text"
                        value={item.description}
                        onChange={(e) => handleDraftItemChange(index, 'description', e.target.value)}
                      />
                      <input
                        className="edit-input"
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleDraftItemChange(index, 'quantity', e.target.value)}
                      />
                      <input
                        className="edit-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={(item.unitPriceCents / 100).toFixed(2)}
                        onChange={(e) => handleDraftItemChange(index, 'unitPriceCents', e.target.value)}
                      />
                      <div className="amount-cell">
                        {formatCurrency(item.quantity * item.unitPriceCents)}
                        <button
                          type="button"
                          className="remove-item-btn"
                          onClick={() => handleRemoveDraftItem(index)}
                          disabled={(draftForm?.lineItems || []).length === 1}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="add-item-btn" onClick={handleAddDraftItem}>
                    + Add Item
                  </button>
                  <div className="totals">
                    <div className="total-row">
                      <span>Subtotal</span>
                      <span>{formatCurrency(draftTotals.subtotal)}</span>
                    </div>
                    <div className="total-row">
                      <span>Tax</span>
                      <span>{formatCurrency(draftTotals.tax)}</span>
                    </div>
                    <div className="total-row final">
                      <span>Total</span>
                      <span>{formatCurrency(draftTotals.total)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="line-items-card">
                  <div className="line-items-header">
                    <span>Description</span>
                    <span>Qty</span>
                    <span>Price</span>
                    <span>Amount</span>
                  </div>
                  {invoice?.items?.map((item, index) => (
                    <div key={index} className="line-item-row">
                      <span>{item.description}</span>
                      <span>{item.quantity}</span>
                      <span>{formatCurrency(item.unitPrice)}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="totals">
                    <div className="total-row">
                      <span>Subtotal</span>
                      <span>{formatCurrency(invoice?.subtotal || 0)}</span>
                    </div>
                    <div className="total-row">
                      <span>Tax</span>
                      <span>{formatCurrency(invoice?.tax || 0)}</span>
                    </div>
                    <div className="total-row final">
                      <span>Total</span>
                      <span>{formatCurrency(invoice?.total || 0)}</span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Notes */}
            {(isEditing && isDraft) || invoice?.notes ? (
              <section className="info-section">
                <h2 className="section-title">Notes</h2>
                <div className="info-card">
                  {isEditing && isDraft ? (
                    <textarea
                      className="edit-textarea"
                      rows={4}
                      value={draftForm?.notes || ''}
                      onChange={(e) => handleDraftFieldChange('notes', e.target.value)}
                    />
                  ) : (
                    <p className="notes-text">{invoice?.notes}</p>
                  )}
                </div>
              </section>
            ) : null}
          </div>

          {/* Payment & Actions Sidebar */}
          <div className="actions-sidebar">
            {/* Pipeline Status - Show when processing */}
            {pipelineStatus && ['PAID_DETECTED', 'CONVERTING', 'SETTLING', 'CASHED_OUT', 'COMPLETE'].includes(invoice?.status) && (
              <div className="pipeline-section">
                <h3>Payment Pipeline</h3>
                <div className="pipeline-steps">
                  <div className={`pipeline-step ${pipelineStatus.currentStage === 'detecting' || pipelineStatus.stages?.detecting?.status === 'complete' ? 'active' : ''} ${pipelineStatus.stages?.detecting?.status === 'complete' ? 'complete' : ''}`}>
                    <div className="step-indicator">1</div>
                    <div className="step-info">
                      <span className="step-name">Payment Detected</span>
                      {pipelineStatus.paymentChain && (
                        <span className="step-detail">via {pipelineStatus.paymentChain}</span>
                      )}
                    </div>
                  </div>
                  {invoice?.conversionMode !== 'MODE_B' && invoice?.settlementTarget !== invoice?.lockedQuote?.paymentChain && (
                    <div className={`pipeline-step ${pipelineStatus.currentStage === 'converting' ? 'active' : ''} ${pipelineStatus.stages?.converting?.status === 'complete' ? 'complete' : ''}`}>
                      <div className="step-indicator">2</div>
                      <div className="step-info">
                        <span className="step-name">Converting</span>
                        <span className="step-detail">to {invoice?.settlementTarget}</span>
                      </div>
                    </div>
                  )}
                  <div className={`pipeline-step ${pipelineStatus.currentStage === 'settling' || pipelineStatus.currentStage === 'cashingOut' ? 'active' : ''} ${pipelineStatus.stages?.settling?.status === 'complete' || pipelineStatus.stages?.cashingOut?.status === 'complete' ? 'complete' : ''}`}>
                    <div className="step-indicator">{invoice?.conversionMode === 'MODE_B' || invoice?.settlementTarget === invoice?.lockedQuote?.paymentChain ? '2' : '3'}</div>
                    <div className="step-info">
                      <span className="step-name">{invoice?.settlementTarget === 'USD' ? 'Cashing Out' : 'Settling'}</span>
                      {pipelineStatus.settlementAmount && (
                        <span className="step-detail">{pipelineStatus.settlementAmount}</span>
                      )}
                    </div>
                  </div>
                  <div className={`pipeline-step ${invoice?.status === 'COMPLETE' ? 'complete' : ''}`}>
                    <div className="step-indicator">✓</div>
                    <div className="step-info">
                      <span className="step-name">Complete</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* QR Code */}
            {showQR && (
              <div className="qr-section">
                <h3>Payment QR Code</h3>
                <div className="qr-container">
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api'}/public/invoice/${invoiceId}/qr`}
                    alt="Payment QR Code"
                    className="qr-image"
                  />
                </div>
                <p className="qr-amount">Solana Pay</p>
                <button className="copy-btn" onClick={handleCopyPaymentUrl}>
                  Copy Payment URL
                </button>
                <a
                  href={`/pay/${invoiceId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-payment-link"
                >
                  View Payment Page →
                </a>
              </div>
            )}

            {/* Actions */}
            <div className="actions-section">
              <h3>Actions</h3>

              {isDraft && (
                <>
                  <motion.button
                    className="action-btn primary full-width"
                    onClick={handleSend}
                    disabled={actionLoading === 'send' || isEditing}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {actionLoading === 'send' ? (
                      <><span className="spinner" /> Sending...</>
                    ) : (
                      'Send Invoice'
                    )}
                  </motion.button>
                  <motion.button
                    className="action-btn secondary full-width"
                    onClick={handleEditDraft}
                    disabled={actionLoading || isEditing}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Edit Draft
                  </motion.button>
                  <motion.button
                    className="action-btn secondary full-width"
                    onClick={handleSaveDraft}
                    disabled={actionLoading === 'save' || !isEditing}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {actionLoading === 'save' ? (
                      <><span className="spinner light" /> Saving...</>
                    ) : (
                      'Save Draft'
                    )}
                  </motion.button>
                  <button
                    className="action-btn danger-outline full-width"
                    onClick={handleDelete}
                    disabled={actionLoading === 'delete'}
                  >
                    {actionLoading === 'delete' ? 'Deleting...' : 'Delete Invoice'}
                  </button>
                </>
              )}

              {canCheckPayment && (
                <motion.button
                  className="action-btn secondary full-width"
                  onClick={handleCheckPayment}
                  disabled={actionLoading === 'check'}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {actionLoading === 'check' ? (
                    <><span className="spinner light" /> Checking...</>
                  ) : (
                    'Check Payment'
                  )}
                </motion.button>
              )}

              {/* Simulate Payment - For testing */}
              {canCheckPayment && (
                <div className="simulate-payment-section">
                  <label className="simulate-label">Test: Simulate Payment</label>
                  <div className="simulate-controls">
                    <select
                      className="simulate-select"
                      value={selectedSimChain}
                      onChange={(e) => setSelectedSimChain(e.target.value)}
                      disabled={actionLoading === 'simulate'}
                    >
                      {invoice?.paymentOptions?.allowBtc && <option value="BTC">BTC</option>}
                      {invoice?.paymentOptions?.allowEth && <option value="ETH">ETH</option>}
                      {invoice?.paymentOptions?.allowSol && <option value="SOL">SOL</option>}
                    </select>
                    <button
                      className="action-btn simulate full-width"
                      onClick={handleSimulatePayment}
                      disabled={actionLoading === 'simulate'}
                    >
                      {actionLoading === 'simulate' ? 'Simulating...' : 'Simulate'}
                    </button>
                  </div>
                </div>
              )}

              {canCancel && (
                <button
                  className="action-btn danger full-width"
                  onClick={handleCancel}
                  disabled={actionLoading === 'cancel'}
                >
                  {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Invoice'}
                </button>
              )}

              {!isDraft && canDelete && (
                <button
                  className="action-btn danger-outline full-width"
                  onClick={handleDelete}
                  disabled={actionLoading === 'delete'}
                >
                  {actionLoading === 'delete' ? 'Deleting...' : 'Delete Invoice'}
                </button>
              )}

              {/* View Receipt - Show when complete */}
              {invoice?.status === 'COMPLETE' && (
                <motion.button
                  className="action-btn primary full-width"
                  onClick={() => router.push(`/invoices/${invoiceId}/receipt`)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  View Receipt
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InvoiceDetail;
