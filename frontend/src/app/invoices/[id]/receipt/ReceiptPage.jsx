'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import './ReceiptPage.css';

// Chain display info
const CHAIN_INFO = {
  BTC: { name: 'Bitcoin', symbol: '₿', color: '#f7931a', explorer: 'BlockCypher' },
  ETH: { name: 'Ethereum', symbol: 'Ξ', color: '#627eea', explorer: 'Etherscan' },
  SOL: { name: 'Solana', symbol: '◎', color: '#14f195', explorer: 'Solana Explorer' },
};

// Explorer URL generators (testnet)
const getExplorerUrl = (chain, txHash) => {
  switch (chain?.toUpperCase()) {
    case 'BTC':
      return `https://live.blockcypher.com/btc-testnet/tx/${txHash}`;
    case 'ETH':
      return `https://sepolia.etherscan.io/tx/${txHash}`;
    case 'SOL':
      return `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;
    default:
      return '#';
  }
};

const getAddressExplorerUrl = (chain, address) => {
  switch (chain?.toUpperCase()) {
    case 'BTC':
      return `https://live.blockcypher.com/btc-testnet/address/${address}`;
    case 'ETH':
      return `https://sepolia.etherscan.io/address/${address}`;
    case 'SOL':
      return `https://explorer.solana.com/address/${address}?cluster=devnet`;
    default:
      return '#';
  }
};

const ReceiptPage = () => {
  const { user, business, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id;

  const [invoice, setInvoice] = useState(null);
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Format datetime
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Truncate hash for display
  const truncateHash = (hash) => {
    if (!hash) return '-';
    if (hash.length <= 20) return hash;
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [invoiceRes, pipelineRes] = await Promise.all([
          api.invoices.get(invoiceId),
          api.invoices.getPipelineStatus(invoiceId),
        ]);
        setInvoice(invoiceRes.data);
        setPipelineStatus(pipelineRes.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch receipt data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId) {
      fetchData();
    }
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '◫', path: '/dashboard' },
    { id: 'invoices', label: 'Invoices', icon: '◧', path: '/invoices' },
    { id: 'settings', label: 'Settings', icon: '⚙', path: '/settings' },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="receipt-page">
        <aside className="sidebar no-print">
          <div className="sidebar-logo">
            <div className="skeleton skeleton-logo" />
          </div>
        </aside>
        <main className="main-content">
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Loading receipt...</p>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="receipt-page">
        <aside className="sidebar no-print">
          <div className="sidebar-logo">
            <svg className="sidebar-logo-svg" viewBox="0 0 600 200">
              <defs>
                <linearGradient id="silverGradientReceipt" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e8e8e8" />
                  <stop offset="50%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#d0d0d0" />
                </linearGradient>
                <path id="curvedTextPathReceipt" d="M 50 140 Q 300 80 550 140" fill="none" />
              </defs>
              <text className="sidebar-curved-text" fill="url(#silverGradientReceipt)">
                <textPath href="#curvedTextPathReceipt" startOffset="50%" textAnchor="middle">NOVA</textPath>
              </text>
            </svg>
          </div>
        </aside>
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

  // Check if invoice is complete
  const isComplete = invoice?.status === 'COMPLETE';
  // Pipeline status comes from API as { success: true, data: { status: {...}, summary: {...} } }
  const stages = pipelineStatus?.status?.stages || pipelineStatus?.stages;
  const payment = stages?.payment;
  const conversion = stages?.conversion;
  const settlement = stages?.settlement;
  const cashout = stages?.cashout;

  return (
    <div className="receipt-page">
      {/* Sidebar - hidden on print */}
      <aside className="sidebar no-print">
        <div className="sidebar-logo">
          <svg className="sidebar-logo-svg" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="silverGradientReceipt" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e8e8e8" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#d0d0d0" />
              </linearGradient>
              <path id="curvedTextPathReceipt" d="M 50 140 Q 300 80 550 140" fill="none" />
            </defs>
            <text className="sidebar-curved-text" fill="url(#silverGradientReceipt)">
              <textPath href="#curvedTextPathReceipt" startOffset="50%" textAnchor="middle">NOVA</textPath>
            </text>
          </svg>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              className={`nav-item ${item.id === 'invoices' ? 'active' : ''}`}
              onClick={() => router.push(item.path)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </motion.button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.charAt(0) || 'U'}</div>
            <div className="user-details">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className="user-email">{user?.email || ''}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">↗</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="content-header no-print">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <button className="back-btn" onClick={() => router.push(`/invoices/${invoiceId}`)}>
              ← Back to Invoice
            </button>
          </motion.div>
        </header>

        {/* Receipt Card */}
        <motion.div
          className="receipt-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Receipt Header */}
          <div className="receipt-header">
            <div className="receipt-logo">
              <svg viewBox="0 0 600 200" className="receipt-logo-svg">
                <defs>
                  <linearGradient id="receiptGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#333" />
                    <stop offset="50%" stopColor="#555" />
                    <stop offset="100%" stopColor="#333" />
                  </linearGradient>
                  <path id="receiptTextPath" d="M 50 140 Q 300 80 550 140" fill="none" />
                </defs>
                <text className="receipt-curved-text" fill="url(#receiptGrad)">
                  <textPath href="#receiptTextPath" startOffset="50%" textAnchor="middle">NOVA</textPath>
                </text>
              </svg>
            </div>
            <div className="receipt-title">
              <h1>Payment Receipt</h1>
              <p className="receipt-subtitle">Invoice #{invoice?.invoiceNumber}</p>
            </div>
            <div className={`receipt-status ${isComplete ? 'complete' : 'processing'}`}>
              {isComplete ? 'PAID' : invoice?.status}
            </div>
          </div>

          {/* Invoice Summary */}
          <section className="receipt-section">
            <h2 className="section-heading">Invoice Summary</h2>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Client</span>
                <span className="summary-value">{invoice?.clientName}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Invoice Number</span>
                <span className="summary-value">{invoice?.invoiceNumber}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Amount</span>
                <span className="summary-value amount">{formatCurrency(invoice?.total || 0)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Issue Date</span>
                <span className="summary-value">{formatDate(invoice?.issueDate)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Paid Date</span>
                <span className="summary-value">{formatDate(invoice?.paidAt)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Settlement Target</span>
                <span className="summary-value">{invoice?.settlementTarget}</span>
              </div>
            </div>
          </section>

          {/* Payment Evidence */}
          {payment && (
            <section className="receipt-section evidence-section">
              <h2 className="section-heading">
                <span className="section-icon payment">1</span>
                Payment Received
              </h2>
              <div className="evidence-card">
                <div className="evidence-header">
                  <div className={`chain-badge ${payment.chain?.toLowerCase()}`}>
                    <span className="chain-symbol">{CHAIN_INFO[payment.chain]?.symbol}</span>
                    <span>{CHAIN_INFO[payment.chain]?.name}</span>
                  </div>
                  <span className="evidence-timestamp">{formatDateTime(payment.timestamp)}</span>
                </div>
                <div className="evidence-body">
                  <div className="evidence-row">
                    <span className="evidence-label">Amount</span>
                    <span className="evidence-value">{payment.amount} {payment.chain}</span>
                  </div>
                  <div className="evidence-row">
                    <span className="evidence-label">Transaction Hash</span>
                    <div className="evidence-hash-row">
                      <code className="evidence-hash">{truncateHash(payment.txHash)}</code>
                      <a
                        href={getExplorerUrl(payment.chain, payment.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="explorer-link"
                      >
                        View on {CHAIN_INFO[payment.chain]?.explorer} →
                      </a>
                    </div>
                  </div>
                  <div className="evidence-row full-hash">
                    <code className="hash-full">{payment.txHash}</code>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Conversion Evidence (Mode A) */}
          {conversion && (
            <section className="receipt-section evidence-section">
              <h2 className="section-heading">
                <span className="section-icon conversion">2</span>
                Conversion
              </h2>
              <div className="evidence-card conversion-card">
                <div className="conversion-flow">
                  <div className="conversion-from">
                    <span className={`chain-badge small ${conversion.from?.toLowerCase()}`}>
                      {CHAIN_INFO[conversion.from]?.symbol} {conversion.from}
                    </span>
                    <span className="conversion-amount">{conversion.fromAmount}</span>
                  </div>
                  <div className="conversion-arrow">→</div>
                  <div className="conversion-to">
                    <span className={`chain-badge small ${conversion.to?.toLowerCase()}`}>
                      {conversion.to === 'USD' ? '$' : CHAIN_INFO[conversion.to]?.symbol} {conversion.to}
                    </span>
                    <span className="conversion-amount">{conversion.toAmount}</span>
                  </div>
                </div>
                {conversion.txHash && (
                  <div className="evidence-body">
                    <div className="evidence-row">
                      <span className="evidence-label">Conversion TX</span>
                      <div className="evidence-hash-row">
                        <code className="evidence-hash">{truncateHash(conversion.txHash)}</code>
                        {conversion.to !== 'USD' && (
                          <a
                            href={getExplorerUrl(conversion.to, conversion.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="explorer-link"
                          >
                            View →
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="evidence-row">
                      <span className="evidence-label">Completed At</span>
                      <span className="evidence-value">{formatDateTime(conversion.timestamp)}</span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Settlement Evidence (Crypto) */}
          {settlement && (
            <section className="receipt-section evidence-section">
              <h2 className="section-heading">
                <span className="section-icon settlement">{conversion ? '3' : '2'}</span>
                Settlement
              </h2>
              <div className="evidence-card">
                <div className="evidence-header">
                  <div className={`chain-badge ${settlement.asset?.toLowerCase()}`}>
                    <span className="chain-symbol">{CHAIN_INFO[settlement.asset]?.symbol}</span>
                    <span>{CHAIN_INFO[settlement.asset]?.name}</span>
                  </div>
                  <span className="evidence-timestamp">{formatDateTime(settlement.timestamp)}</span>
                </div>
                <div className="evidence-body">
                  <div className="evidence-row">
                    <span className="evidence-label">Amount Settled</span>
                    <span className="evidence-value">{settlement.amount} {settlement.asset}</span>
                  </div>
                  <div className="evidence-row">
                    <span className="evidence-label">To Address</span>
                    <div className="evidence-hash-row">
                      <code className="evidence-hash">{truncateHash(settlement.toAddress)}</code>
                      <a
                        href={getAddressExplorerUrl(settlement.asset, settlement.toAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="explorer-link"
                      >
                        View →
                      </a>
                    </div>
                  </div>
                  <div className="evidence-row">
                    <span className="evidence-label">Settlement TX</span>
                    <div className="evidence-hash-row">
                      <code className="evidence-hash">{truncateHash(settlement.txHash)}</code>
                      <a
                        href={getExplorerUrl(settlement.asset, settlement.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="explorer-link"
                      >
                        View on {CHAIN_INFO[settlement.asset]?.explorer} →
                      </a>
                    </div>
                  </div>
                  <div className="evidence-row full-hash">
                    <code className="hash-full">{settlement.txHash}</code>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Cashout Evidence (USD) */}
          {cashout && (
            <section className="receipt-section evidence-section">
              <h2 className="section-heading">
                <span className="section-icon cashout">{conversion ? '3' : '2'}</span>
                Bank Deposit (Nessie)
              </h2>
              <div className="evidence-card cashout-card">
                <div className="evidence-header">
                  <div className="chain-badge usd">
                    <span className="chain-symbol">$</span>
                    <span>USD</span>
                  </div>
                  <span className="evidence-timestamp">{formatDateTime(cashout.timestamp)}</span>
                </div>
                <div className="evidence-body">
                  <div className="evidence-row">
                    <span className="evidence-label">Amount Deposited</span>
                    <span className="evidence-value amount">{formatCurrency(cashout.amountCents)}</span>
                  </div>
                  <div className="evidence-row">
                    <span className="evidence-label">Nessie Transfer ID</span>
                    <code className="evidence-hash">{cashout.nessieTransferId || 'Pending'}</code>
                  </div>
                  <div className="evidence-row">
                    <span className="evidence-label">Status</span>
                    <span className={`status-indicator ${cashout.status?.toLowerCase()}`}>
                      {cashout.status === 'COMPLETED' ? 'Deposited' : cashout.status}
                    </span>
                  </div>
                </div>
                <div className="nessie-note">
                  Funds deposited to linked Capital One account via Nessie API
                </div>
              </div>
            </section>
          )}

          {/* Receipt Footer */}
          <div className="receipt-footer">
            <div className="footer-timestamp">
              Receipt generated on {formatDateTime(new Date().toISOString())}
            </div>
            <div className="footer-id">
              Invoice ID: {invoice?._id}
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="receipt-actions no-print">
          <motion.button
            className="action-btn secondary"
            onClick={() => router.push(`/invoices/${invoiceId}`)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            ← Back to Invoice
          </motion.button>
          <motion.button
            className="action-btn primary"
            onClick={handlePrint}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Print Receipt
          </motion.button>
        </div>
      </main>
    </div>
  );
};

export default ReceiptPage;
