'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import './PaymentPage.css';

const CHAIN_INFO = {
  BTC: { name: 'Bitcoin', symbol: '₿', color: '#f7931a' },
  ETH: { name: 'Ethereum', symbol: 'Ξ', color: '#627eea' },
  SOL: { name: 'Solana', symbol: '◎', color: '#14f195' },
};

const PaymentPage = () => {
  const params = useParams();
  const invoiceId = params.id;

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [copied, setCopied] = useState(false);
  const [selectedChain, setSelectedChain] = useState(null);
  const [pipelineStatus, setPipelineStatus] = useState(null);

  // Format currency
  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Fetch invoice
  const fetchInvoice = useCallback(async () => {
    try {
      const data = await api.public.getInvoice(invoiceId);
      const inv = data.data;
      setInvoice(inv);

      // Set default selected chain (first enabled option)
      if (!selectedChain && inv.paymentOptions) {
        if (inv.paymentOptions.allowSol) setSelectedChain('SOL');
        else if (inv.paymentOptions.allowEth) setSelectedChain('ETH');
        else if (inv.paymentOptions.allowBtc) setSelectedChain('BTC');
      }

      // Check if already paid/processing
      if (['PAID_DETECTED', 'CONVERTING', 'SETTLING', 'CASHED_OUT', 'COMPLETE'].includes(inv.status)) {
        setPaymentStatus('paid');
      } else if (inv.status === 'CANCELLED') {
        setPaymentStatus('cancelled');
      }

      setError(null);
    } catch (err) {
      console.error('Failed to fetch invoice:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [invoiceId, selectedChain]);

  // Fetch pipeline status when payment detected
  const fetchPipelineStatus = useCallback(async () => {
    try {
      const data = await api.public.getPipelineStatus(invoiceId);
      if (data.success) {
        setPipelineStatus(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch pipeline status:', err);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId, fetchInvoice]);

  // Poll for payment status
  useEffect(() => {
    if (!invoice || paymentStatus === 'cancelled') return;
    if (!['SENT', 'PENDING'].includes(invoice.status) && paymentStatus !== 'paid') return;

    const pollInterval = setInterval(async () => {
      try {
        const result = await api.public.checkPayment(invoiceId);
        if (result.data?.paid) {
          setPaymentStatus('paid');
          fetchInvoice();
          fetchPipelineStatus();
        }
      } catch (err) {
        console.error('Error checking payment:', err);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [invoice, invoiceId, paymentStatus, fetchInvoice, fetchPipelineStatus]);

  // Poll pipeline status when processing
  useEffect(() => {
    if (!invoice) return;
    if (!['PAID_DETECTED', 'CONVERTING', 'SETTLING', 'CASHED_OUT'].includes(invoice.status)) return;

    fetchPipelineStatus();
    const interval = setInterval(fetchPipelineStatus, 3000);
    return () => clearInterval(interval);
  }, [invoice?.status, fetchPipelineStatus]);

  // Manual payment check
  const handleCheckPayment = async () => {
    setCheckingPayment(true);
    try {
      const result = await api.public.checkPayment(invoiceId);
      if (result.data?.paid) {
        setPaymentStatus('paid');
        fetchInvoice();
        fetchPipelineStatus();
      } else {
        setPaymentStatus('not_found');
        setTimeout(() => setPaymentStatus(null), 3000);
      }
    } catch (err) {
      console.error('Error checking payment:', err);
    } finally {
      setCheckingPayment(false);
    }
  };

  // Copy address to clipboard
  const handleCopyAddress = () => {
    const address = invoice?.depositAddresses?.[selectedChain?.toLowerCase()];
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get enabled chains (MVP: ETH and SOL only, no Bitcoin)
  const getEnabledChains = () => {
    if (!invoice?.paymentOptions) return [];
    const chains = [];
    if (invoice.paymentOptions.allowEth) chains.push('ETH');
    if (invoice.paymentOptions.allowSol) chains.push('SOL');
    return chains;
  };

  // Get selected chain's payment amount
  const getPaymentAmount = () => {
    if (!selectedChain || !invoice?.formattedAmounts) return null;
    return invoice.formattedAmounts[selectedChain.toLowerCase()];
  };

  // Get quote time remaining
  const getQuoteTimeRemaining = () => {
    if (!invoice?.quote?.secondsRemaining) return null;
    const mins = Math.floor(invoice.quote.secondsRemaining / 60);
    const secs = invoice.quote.secondsRemaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="payment-page">
        <div className="payment-container">
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading invoice...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="payment-page">
        <div className="payment-container">
          <div className="error-state">
            <div className="error-icon">!</div>
            <h2>Invoice Not Found</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Cancelled state
  if (paymentStatus === 'cancelled' || invoice?.status === 'CANCELLED') {
    return (
      <div className="payment-page">
        <div className="payment-container">
          <div className="cancelled-state">
            <div className="cancelled-icon">×</div>
            <h2>Invoice Cancelled</h2>
            <p>This invoice has been cancelled and is no longer payable.</p>
          </div>
        </div>
      </div>
    );
  }

  // Get explorer URL for transaction
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

  // Success state - show pipeline progress
  if (paymentStatus === 'paid') {
    const isComplete = invoice?.status === 'COMPLETE';
    const paymentChain = invoice?.paymentChain || invoice?.lockedQuote?.paymentChain;
    const paymentTxHash = invoice?.paymentTxHash;

    return (
      <div className="payment-page">
        <div className="payment-container">
          <motion.div
            className="success-state"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className={`success-icon ${isComplete ? '' : 'processing'}`}>
              {isComplete ? '✓' : '⟳'}
            </div>
            <h2>{isComplete ? 'Payment Complete!' : 'Payment Processing...'}</h2>
            <p>{isComplete ? 'Thank you for your payment.' : 'Your payment has been detected and is being processed.'}</p>

            {/* Pipeline Progress - backend returns steps array */}
            {pipelineStatus && (
              <div className="pipeline-progress">
                <div className={`progress-step ${(pipelineStatus.steps?.length >= 1 || isComplete) ? 'complete' : 'active'}`}>
                  <span className="step-dot" />
                  <span className="step-label">Payment Detected</span>
                </div>
                {invoice?.conversionMode !== 'MODE_B' && (
                  <div className={`progress-step ${pipelineStatus.steps?.length >= 2 ? 'complete' : pipelineStatus.overallStatus === 'CONVERTING' ? 'active' : ''}`}>
                    <span className="step-dot" />
                    <span className="step-label">Converting</span>
                  </div>
                )}
                <div className={`progress-step ${pipelineStatus.steps?.length >= 3 || isComplete ? 'complete' : ['SETTLING', 'CASHED_OUT'].includes(pipelineStatus.overallStatus) ? 'active' : ''}`}>
                  <span className="step-dot" />
                  <span className="step-label">{invoice?.settlementTarget === 'USD' ? 'Cashing Out' : 'Settling'}</span>
                </div>
                <div className={`progress-step ${isComplete ? 'complete' : ''}`}>
                  <span className="step-dot" />
                  <span className="step-label">Complete</span>
                </div>
              </div>
            )}

            <div className="success-details">
              <div className="detail-row">
                <span>Invoice</span>
                <span>{invoice?.invoiceNumber}</span>
              </div>
              <div className="detail-row">
                <span>Amount</span>
                <span>{invoice?.formattedTotal || formatCurrency(invoice?.total)}</span>
              </div>
              {paymentChain && (
                <div className="detail-row">
                  <span>Paid via</span>
                  <span className="chain-indicator">{CHAIN_INFO[paymentChain]?.symbol} {paymentChain}</span>
                </div>
              )}
              {paymentTxHash && (
                <div className="detail-row tx-row">
                  <span>Transaction</span>
                  <a
                    href={getExplorerUrl(paymentChain, paymentTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tx-link"
                  >
                    {paymentTxHash.slice(0, 8)}...{paymentTxHash.slice(-6)} →
                  </a>
                </div>
              )}
            </div>

            {/* Completion message */}
            {isComplete && (
              <div className="completion-message">
                <p>A receipt has been generated for this transaction.</p>
                <p className="receipt-note">The merchant will receive your payment according to their settlement preferences.</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // Payment page
  const enabledChains = getEnabledChains();
  const paymentAmount = getPaymentAmount();
  const quoteTime = getQuoteTimeRemaining();
  const depositAddress = invoice?.depositAddresses?.[selectedChain?.toLowerCase()];

  return (
    <div className="payment-page">
      <div className="payment-container">
        {/* Header */}
        <motion.div
          className="payment-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <svg className="payment-logo" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="silverGradientPay" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e8e8e8" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#d0d0d0" />
              </linearGradient>
              <path id="curvedTextPathPay" d="M 50 140 Q 300 80 550 140" fill="none" />
            </defs>
            <text className="payment-logo-text" fill="url(#silverGradientPay)">
              <textPath href="#curvedTextPathPay" startOffset="50%" textAnchor="middle">NOVA</textPath>
            </text>
          </svg>
          <p className="payment-subtitle">Multi-Chain Crypto Payment</p>
        </motion.div>

        {/* Invoice Summary */}
        <motion.div
          className="invoice-summary"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="summary-row">
            <span className="summary-label">Invoice</span>
            <span className="summary-value">{invoice?.invoiceNumber}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">From</span>
            <span className="summary-value">{invoice?.businessName}</span>
          </div>
          <div className="summary-row total">
            <span className="summary-label">Amount Due</span>
            <span className="summary-value">{invoice?.formattedTotal || formatCurrency(invoice?.total)}</span>
          </div>
        </motion.div>

        {/* Chain Selector */}
        <motion.div
          className="chain-selector"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <p className="selector-label">Select Payment Method</p>
          <div className="chain-tabs">
            {enabledChains.map((chain) => (
              <button
                key={chain}
                className={`chain-tab ${selectedChain === chain ? 'active' : ''}`}
                onClick={() => setSelectedChain(chain)}
                style={{ '--chain-color': CHAIN_INFO[chain].color }}
              >
                <span className="chain-symbol">{CHAIN_INFO[chain].symbol}</span>
                <span className="chain-name">{chain}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Payment Details for Selected Chain */}
        <motion.div
          className="payment-details"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          key={selectedChain}
        >
          {/* QR Code - only for SOL */}
          {selectedChain === 'SOL' && invoice?.solanaPayUrl && (
            <div className="qr-container">
              <img
                src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api'}/public/invoice/${invoiceId}/qr`}
                alt="Solana Pay QR Code"
                className="qr-image"
              />
            </div>
          )}

          {/* Payment Amount */}
          <div className="payment-amount">
            <span className="amount-value">{paymentAmount || '...'}</span>
            <span className="amount-token">{selectedChain}</span>
          </div>

          {/* Quote Timer */}
          {quoteTime && (
            <div className="quote-timer">
              <span className="timer-icon">⏱</span>
              <span>Quote valid for {quoteTime}</span>
            </div>
          )}

          {/* Deposit Address */}
          <div className="deposit-address-section">
            <p className="address-label">Send to this {CHAIN_INFO[selectedChain]?.name} address:</p>
            <div className="address-box">
              <code className="address-text">{depositAddress || 'Loading...'}</code>
              <button className="copy-address-btn" onClick={handleCopyAddress}>
                {copied ? '✓' : '⧉'}
              </button>
            </div>
          </div>

          <p className="payment-instruction">
            {selectedChain === 'SOL'
              ? 'Scan QR code or copy address to send payment'
              : `Send exactly ${paymentAmount || '...'} ${selectedChain} to the address above`}
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="payment-actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <button
            className="action-btn check"
            onClick={handleCheckPayment}
            disabled={checkingPayment}
          >
            {checkingPayment ? (
              <><span className="spinner" /> Checking...</>
            ) : (
              "I've Made the Payment"
            )}
          </button>

          {paymentStatus === 'not_found' && (
            <p className="status-message">
              Payment not found yet. Please wait a moment and try again.
            </p>
          )}
        </motion.div>

        {/* Line Items (collapsible) */}
        <motion.details
          className="line-items-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <summary className="details-toggle">View Invoice Details</summary>
          <div className="line-items-content">
            {invoice?.items?.map((item, index) => (
              <div key={index} className="line-item">
                <div className="item-desc">
                  <span className="item-name">{item.description}</span>
                  <span className="item-qty">x {item.quantity}</span>
                </div>
                <span className="item-amount">{formatCurrency(item.amount)}</span>
              </div>
            ))}
            <div className="line-item total">
              <span>Total</span>
              <span>{invoice?.formattedTotal}</span>
            </div>
          </div>
        </motion.details>

        {/* Footer */}
        <div className="payment-footer">
          <p>Powered by <strong>NOVA</strong> • Multi-Chain Payments</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
