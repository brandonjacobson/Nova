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
    eth: '',
    sol: '',
  });

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
        setPayoutAddresses(data.data.payoutAddresses || { eth: '', sol: '' });
        setDefaults(data.data.defaults || { defaultSettlementTarget: 'USD', defaultConversionMode: 'MODE_A' });
      }
      setError(null);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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
