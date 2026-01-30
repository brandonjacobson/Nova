'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import './SettingsPage.css';

const SettingsPage = () => {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const router = useRouter();

  // Form states
  const [payoutAddresses, setPayoutAddresses] = useState({
    btc: '',
    eth: '',
    sol: '',
  });

  const [nessie, setNessie] = useState({
    accountId: '',
    customerId: '',
    accountValid: false,
    accountDetails: null,
    customer: null,
    simulated: false,
  });

  const [nessieBalance, setNessieBalance] = useState(null);
  const [nessieTransactions, setNessieTransactions] = useState([]);
  const [showProvisionForm, setShowProvisionForm] = useState(false);

  const [defaults, setDefaults] = useState({
    defaultSettlementTarget: 'USD',
    defaultConversionMode: 'MODE_A',
  });

  // UI states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await api.settings.get();
      if (data.success) {
        setPayoutAddresses(data.data.payoutAddresses || { btc: '', eth: '', sol: '' });
        setNessie(data.data.nessie || { accountId: '', accountValid: false, accountDetails: null, simulated: false });
        setDefaults(data.data.defaults || { defaultSettlementTarget: 'USD', defaultConversionMode: 'MODE_A' });

        // Fetch Nessie balance and transactions if account is connected
        if (data.data.nessie?.accountId && data.data.nessie?.accountValid) {
          fetchNessieData();
        }
      }
      setError(null);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNessieData = async () => {
    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        api.settings.getNessieBalance().catch(() => null),
        api.settings.getNessieTransactions(10).catch(() => null),
      ]);

      if (balanceRes?.success) {
        setNessieBalance(balanceRes.data);
      }

      if (transactionsRes?.success) {
        setNessieTransactions(transactionsRes.data.transactions || []);
      }
    } catch (err) {
      console.warn('Failed to fetch Nessie data:', err);
    }
  };

  // Save handlers
  const handleSavePayoutAddresses = async () => {
    setSaving('payout');
    setError(null);
    setSuccess(null);
    try {
      await api.settings.updatePayoutAddresses(payoutAddresses);
      setSuccess('Payout addresses saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveNessie = async () => {
    setSaving('nessie');
    setError(null);
    setSuccess(null);
    try {
      const data = await api.settings.updateNessie(nessie.accountId);
      if (data.success) {
        setNessie(data.data);
        setSuccess(nessie.accountId ? 'Nessie account connected' : 'Nessie account disconnected');
        setTimeout(() => setSuccess(null), 3000);

        // Fetch Nessie data after successful connection
        if (data.data.accountId && data.data.accountValid) {
          fetchNessieData();
        } else {
          // Clear data if disconnected
          setNessieBalance(null);
          setNessieTransactions([]);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveDefaults = async () => {
    setSaving('defaults');
    setError(null);
    setSuccess(null);
    try {
      await api.settings.updateDefaults(defaults);
      setSuccess('Default settings saved');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleProvisionNessie = async () => {
    setSaving('provision');
    setError(null);
    setSuccess(null);
    try {
      const data = await api.settings.provisionNessie();
      if (data.success) {
        setNessie({
          accountId: data.data.accountId,
          customerId: data.data.customerId,
          accountValid: true,
          accountDetails: data.data.account,
          customer: data.data.customer,
        });
        setShowProvisionForm(false);
        setSuccess(data.data.simulated
          ? 'Bank account created (Demo mode)'
          : 'Bank account created successfully!');
        setTimeout(() => setSuccess(null), 3000);

        // Fetch balance after provisioning
        fetchNessieData();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Loading settings...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="settings-page">
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
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Configure your payout addresses and preferences</p>
          </motion.div>
        </header>

        {/* Messages */}
        {error && (
          <div className="message error">
            {error}
          </div>
        )}
        {success && (
          <div className="message success">
            {success}
          </div>
        )}

        <div className="settings-grid">
          {/* Payout Addresses */}
          <motion.section
            className="settings-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="card-header">
              <h2 className="card-title">Payout Addresses</h2>
              <p className="card-description">Where to receive crypto payments</p>
            </div>

            <div className="form-group">
              <label htmlFor="btc-address">
                <span className="chain-badge btc">BTC</span>
                Bitcoin Address
              </label>
              <input
                type="text"
                id="btc-address"
                value={payoutAddresses.btc}
                onChange={(e) => setPayoutAddresses(prev => ({ ...prev, btc: e.target.value }))}
                placeholder="bc1q... or 1... or 3..."
                disabled={saving === 'payout'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="eth-address">
                <span className="chain-badge eth">ETH</span>
                Ethereum Address
              </label>
              <input
                type="text"
                id="eth-address"
                value={payoutAddresses.eth}
                onChange={(e) => setPayoutAddresses(prev => ({ ...prev, eth: e.target.value }))}
                placeholder="0x..."
                disabled={saving === 'payout'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="sol-address">
                <span className="chain-badge sol">SOL</span>
                Solana Address
              </label>
              <input
                type="text"
                id="sol-address"
                value={payoutAddresses.sol}
                onChange={(e) => setPayoutAddresses(prev => ({ ...prev, sol: e.target.value }))}
                placeholder="Base58 address..."
                disabled={saving === 'payout'}
              />
            </div>


            <button
              className="save-btn"
              onClick={handleSavePayoutAddresses}
              disabled={!isOwner || saving === 'payout'}
            >
              {saving === 'payout' ? 'Saving...' : 'Save Addresses'}
            </button>
          </motion.section>

          {/* Nessie Account */}
          <motion.section
            className="settings-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="card-header">
              <div className="card-title-row">
                <h2 className="card-title">Bank Account (Nessie)</h2>
                {nessie.simulated && nessie.accountValid && (
                  <span className="demo-mode-badge">Demo Mode</span>
                )}
              </div>
              <p className="card-description">Connect for USD payouts</p>
            </div>

            {/* Not connected - show options */}
            {!nessie.accountId && !showProvisionForm && (
              <div className="nessie-connect-options">
                <div className="connect-option">
                  <div className="connect-option-icon">+</div>
                  <h3>Create New Account</h3>
                  <p>Auto-create a new Nessie bank account for your business</p>
                  <button
                    className="option-btn primary"
                    onClick={handleProvisionNessie}
                    disabled={saving === 'provision'}
                  >
                    {saving === 'provision' ? 'Creating...' : 'Create Account'}
                  </button>
                </div>

                <div className="connect-divider">
                  <span>or</span>
                </div>

                <div className="connect-option">
                  <div className="connect-option-icon">~</div>
                  <h3>Connect Existing</h3>
                  <p>Enter an existing Nessie account ID</p>
                  <button
                    className="option-btn secondary"
                    onClick={() => setShowProvisionForm(true)}
                  >
                    Enter Account ID
                  </button>
                </div>
              </div>
            )}

            {/* Manual connection form */}
            {!nessie.accountId && showProvisionForm && (
              <>
                <div className="form-group">
                  <label htmlFor="nessie-account">Account ID</label>
                  <div className="input-with-status">
                    <input
                      type="text"
                      id="nessie-account"
                      value={nessie.accountId}
                      onChange={(e) => setNessie(prev => ({ ...prev, accountId: e.target.value }))}
                      placeholder="Enter Nessie Account ID"
                      disabled={saving === 'nessie'}
                    />
                  </div>
                  <p className="form-hint">Find your account ID in the Nessie dashboard</p>
                </div>

                <div className="button-row">
                  <button
                    className="save-btn"
                    onClick={handleSaveNessie}
                    disabled={saving === 'nessie' || !nessie.accountId}
                  >
                    {saving === 'nessie' ? 'Connecting...' : 'Connect Account'}
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={() => setShowProvisionForm(false)}
                    disabled={saving === 'nessie'}
                  >
                    Back
                  </button>
                </div>
              </>
            )}

            {/* Connected - show account details */}
            {nessie.accountId && nessie.accountValid && (
              <>
                <div className="account-details">
                  {nessie.customer && (
                    <div className="customer-info">
                      <div className="customer-avatar">
                        {nessie.customer.first_name?.charAt(0) || '$'}
                      </div>
                      <div className="customer-details">
                        <span className="customer-name">
                          {nessie.customer.first_name} {nessie.customer.last_name}
                        </span>
                        <span className="customer-address">
                          {nessie.customer.address?.city}, {nessie.customer.address?.state}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Account Type</span>
                    <span className="detail-value">{nessie.accountDetails?.type || 'Checking'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Account ID</span>
                    <span className="detail-value mono">{nessie.accountId.slice(0, 8)}...</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Balance</span>
                    <span className="detail-value highlight">
                      {nessieBalance?.formattedBalance || `$${nessie.accountDetails?.balance?.toLocaleString() || '0'}`}
                      {nessieBalance?.simulated && <span className="demo-badge">Demo</span>}
                    </span>
                  </div>
                </div>

                {/* Transaction History */}
                {nessieTransactions.length > 0 && (
                  <div className="transactions-section">
                    <h3 className="transactions-title">Recent Transactions</h3>
                    <div className="transactions-list">
                      {nessieTransactions.map((tx, index) => (
                        <div key={tx.id || index} className="transaction-item">
                          <div className={`transaction-icon ${tx.type}`}>
                            {tx.type === 'deposit' ? '+' : tx.type === 'withdrawal' ? '-' : tx.type === 'purchase' ? '$' : '~'}
                          </div>
                          <div className="transaction-details">
                            <span className="transaction-desc">{tx.description}</span>
                            <span className="transaction-date">
                              {tx.date ? new Date(tx.date).toLocaleDateString() : 'Recent'}
                              {tx.simulated && ' (Demo)'}
                            </span>
                          </div>
                          <div className={`transaction-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                            {tx.amount >= 0 ? '+' : ''}{typeof tx.amount === 'number' ? `$${Math.abs(tx.amount).toFixed(2)}` : tx.amount}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {nessieTransactions.length === 0 && (
                  <div className="transactions-empty">
                    <p>No transactions yet</p>
                    <p className="transactions-hint">Cashouts from invoices will appear here</p>
                  </div>
                )}

                <button
                  className="disconnect-btn"
                  onClick={() => {
                    setNessie({ accountId: '', customerId: '', accountValid: false, accountDetails: null, customer: null });
                    setNessieBalance(null);
                    setNessieTransactions([]);
                    api.settings.updateNessie('').catch(() => {});
                  }}
                  disabled={saving === 'nessie'}
                >
                  Disconnect Account
                </button>
              </>
            )}

            {/* Connected but invalid */}
            {nessie.accountId && !nessie.accountValid && (
              <div className="account-invalid">
                <p className="invalid-message">Account ID could not be verified</p>
                <div className="form-group">
                  <label htmlFor="nessie-account-retry">Account ID</label>
                  <input
                    type="text"
                    id="nessie-account-retry"
                    value={nessie.accountId}
                    onChange={(e) => setNessie(prev => ({ ...prev, accountId: e.target.value }))}
                    placeholder="Nessie Account ID"
                    disabled={saving === 'nessie'}
                  />
                </div>
                <div className="button-row">
                  <button
                    className="save-btn"
                    onClick={handleSaveNessie}
                    disabled={saving === 'nessie'}
                  >
                    {saving === 'nessie' ? 'Verifying...' : 'Retry'}
                  </button>
                  <button
                    className="disconnect-btn"
                    onClick={() => {
                      setNessie({ accountId: '', customerId: '', accountValid: false, accountDetails: null, customer: null });
                    }}
                    disabled={saving === 'nessie'}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </motion.section>

          {/* Default Settings */}
          <motion.section
            className="settings-card full-width"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="card-header">
              <h2 className="card-title">Default Invoice Settings</h2>
              <p className="card-description">Default values for new invoices</p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="settlement-target">Settlement Target</label>
                <select
                  id="settlement-target"
                  value={defaults.defaultSettlementTarget}
                  onChange={(e) => setDefaults(prev => ({ ...prev, defaultSettlementTarget: e.target.value }))}
                  disabled={saving === 'defaults'}
                >
                  <option value="USD">USD (Fiat)</option>
                  <option value="BTC">BTC (Bitcoin)</option>
                  <option value="ETH">ETH (Ethereum)</option>
                  <option value="SOL">SOL (Solana)</option>
                </select>
                <p className="form-hint">What currency you want to receive</p>
              </div>

              <div className="form-group">
                <label htmlFor="conversion-mode">Conversion Mode</label>
                <select
                  id="conversion-mode"
                  value={defaults.defaultConversionMode}
                  onChange={(e) => setDefaults(prev => ({ ...prev, defaultConversionMode: e.target.value }))}
                  disabled={saving === 'defaults'}
                >
                  <option value="MODE_A">Mode A: Convert & Settle</option>
                  <option value="MODE_B">Mode B: Receive In-Kind</option>
                </select>
                <p className="form-hint">
                  {defaults.defaultConversionMode === 'MODE_A'
                    ? 'Convert any payment to settlement target'
                    : 'Receive exact crypto paid (no conversion)'}
                </p>
              </div>
            </div>

            <button
              className="save-btn"
              onClick={handleSaveDefaults}
              disabled={!isOwner || saving === 'defaults'}
            >
              {saving === 'defaults' ? 'Saving...' : 'Save Defaults'}
            </button>
          </motion.section>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
