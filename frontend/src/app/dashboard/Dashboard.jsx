'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import './Dashboard.css';

// ===== MAIN DASHBOARD COMPONENT =====
const Dashboard = () => {
  const { user, business } = useAuth();
  const router = useRouter();

  // Stats state
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [cashoutData, setCashoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Widget state for drag & drop
  const [widgets, setWidgets] = useState([]);
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [hoveredWidget, setHoveredWidget] = useState(null);

  // Format currency
  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsData, recentData, cashoutRes] = await Promise.all([
          api.dashboard.stats(),
          api.dashboard.recent(5),
          api.dashboard.cashouts(5).catch(() => null), // Graceful fallback
        ]);

        // Extract data from response (backend wraps in { success, data })
        const stats = statsData.data || statsData;
        const recent = recentData.data || recentData;

        // Set cashout data if available
        if (cashoutRes?.data) {
          setCashoutData(cashoutRes.data);
        }

        setStats(stats);
        setRecentActivity([
          ...(recent.invoices || []).map(inv => ({
            type: 'invoice',
            desc: `Invoice #${inv.invoiceNumber} ${inv.status === 'SENT' ? 'sent to' : 'for'} ${inv.clientName}`,
            amount: formatCurrency(inv.total),
            time: formatRelativeTime(inv.createdAt),
            status: inv.status,
          })),
          ...(recent.payments || []).map(pay => ({
            type: 'payment',
            desc: `Payment received`,
            amount: `+${formatCurrency(pay.usdValueCents || 0)}`,
            time: formatRelativeTime(pay.confirmedAt || pay.createdAt),
          })),
        ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5));

        // Map stats to widgets (matching backend response structure)
        const mappedWidgets = [
          {
            id: 'totalRevenue',
            title: 'Total Revenue',
            value: formatCurrency(stats.revenue?.total || 0),
            change: null,
            positive: true,
          },
          {
            id: 'monthRevenue',
            title: 'This Month',
            value: formatCurrency(stats.revenue?.thisMonth || 0),
            change: null,
            positive: true,
          },
          {
            id: 'draft',
            title: 'Draft Invoices',
            value: String(stats.invoices?.draft || 0),
            change: 'Not sent yet',
            positive: null,
          },
          {
            id: 'projected',
            title: 'Projected Revenue',
            value: formatCurrency(stats.projected?.amount || 0),
            change: 'Pending client payments',
            positive: null,
          },
          {
            id: 'sent',
            title: 'Sent Invoices',
            value: String(stats.invoices?.sent || 0),
            change: 'Awaiting payment',
            positive: null,
          },
          {
            id: 'paid',
            title: 'Paid Invoices',
            value: String(stats.invoices?.paid || 0),
            change: 'Completed',
            positive: true,
          },
        ];
        setWidgets(mappedWidgets);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleDragStart = (e, widget) => {
    setDraggedWidget(widget);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetWidget) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget.id === targetWidget.id) return;

    const newWidgets = [...widgets];
    const draggedIndex = newWidgets.findIndex(w => w.id === draggedWidget.id);
    const targetIndex = newWidgets.findIndex(w => w.id === targetWidget.id);

    newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(targetIndex, 0, draggedWidget);

    setWidgets(newWidgets);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
  };

  const handleNewInvoice = () => {
    router.push('/invoices/new');
  };

  // Show loading skeleton
  if (loading) {
    return (
      <div className="dashboard-page">
        <Sidebar user={user} />
        <main className="main-content">
          <header className="content-header">
            <div className="skeleton skeleton-title" />
          </header>
          <section className="widgets-section">
            <div className="widgets-grid">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="widget-card skeleton-widget" />
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <Sidebar user={user} />

      {/* Main Content */}
      <main className="main-content">
        {/* Dashboard Horizon Background */}
        <div className="dashboard-land-container">
          <svg
            className="dashboard-land-svg"
            viewBox="0 0 1440 800"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="horizonLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
                <stop offset="15%" stopColor="#ffffff" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.8" />
                <stop offset="85%" stopColor="#ffffff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
              </linearGradient>
              <filter id="horizonGlow" x="-20%" y="-100%" width="140%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d="M 0 420 Q 720 360 1440 420"
              stroke="url(#horizonLineGradient)"
              strokeWidth="2"
              fill="none"
              filter="url(#horizonGlow)"
            />
            <path
              d="M 0 430 Q 720 370 1440 430"
              stroke="url(#horizonLineGradient)"
              strokeWidth="1"
              fill="none"
              opacity="0.4"
            />
          </svg>
        </div>

        {/* Header */}
        <header className="content-header">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="welcome-title">Welcome to your Frontier, {user?.name || 'there'}</h1>
            <p className="welcome-subtitle">
              {business?.name ? `${business.name} Dashboard` : "Here's what's happening with your finances today."}
            </p>
          </motion.div>

          <motion.button
            className="new-invoice-btn"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(255, 255, 255, 0.2)' }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNewInvoice}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Invoice
          </motion.button>
        </header>

        {/* Widgets Grid */}
        <section className="widgets-section">
          <div className="widgets-grid">
            {widgets.map((widget, index) => (
              <motion.div
                key={widget.id}
                className={`widget-card ${draggedWidget?.id === widget.id ? 'dragging' : ''} ${hoveredWidget === widget.id ? 'hovered' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, widget)}
                onDragOver={(e) => handleDragOver(e, widget)}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setHoveredWidget(widget.id)}
                onMouseLeave={() => setHoveredWidget(null)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.05 }}
                whileHover={{ y: -4, transition: { duration: 0.1 } }}
              >
                {/* Ambient glow effect */}
                <div className="widget-glow" />

                <div className="widget-content">
                  <div className="widget-header">
                    <span className="widget-title">{widget.title}</span>
                    <motion.span
                      className="widget-drag-handle"
                      animate={{
                        opacity: hoveredWidget === widget.id ? 1 : 0.3,
                        scale: hoveredWidget === widget.id ? 1.1 : 1
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      ⋮⋮
                    </motion.span>
                  </div>
                  <div className="widget-value-row">
                    <span className="widget-value">{widget.value}</span>
                    {widget.change && (
                      <span className={`widget-change ${widget.positive === true ? 'positive' : widget.positive === false ? 'negative' : 'neutral'}`}>
                        {widget.change}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Bottom Cards Container - Activity + Fiat side by side */}
        <div className="bottom-cards-container">
          {/* Recent Activity */}
          <section className="activity-section">
            <h2 className="section-title">Recent Activity</h2>
            <div className="activity-list">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <motion.div
                    key={index}
                    className="activity-item"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                  >
                    <div className={`activity-icon ${activity.type}`}>
                      {activity.type === 'payment' ? '↓' : '↗'}
                    </div>
                    <div className="activity-details">
                      <span className="activity-desc">{activity.desc}</span>
                      <div className="activity-meta">
                        <span className="activity-time">{activity.time}</span>
                        {activity.status && (
                          <span className={`activity-status ${activity.status.toLowerCase()}`}>
                            {activity.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`activity-amount ${activity.type === 'payment' ? 'positive' : ''}`}>
                      {activity.amount}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="activity-empty">
                  <p>No recent activity</p>
                  <p className="activity-empty-hint">Create your first invoice to get started</p>
                </div>
              )}
            </div>
          </section>

          {/* Fiat Settlement / Nessie Section */}
          <motion.section
            className="fiat-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
          <div className="fiat-header">
            <h2 className="section-title">Fiat Settlement</h2>
            {cashoutData?.nessie?.connected && (
              <span className="nessie-status connected">Bank Connected</span>
            )}
          </div>

          {cashoutData?.nessie?.connected ? (
            <div className="fiat-content">
              {/* Nessie Summary Cards */}
              <div className="fiat-summary">
                <div className="fiat-card">
                  <span className="fiat-card-label">Bank Balance</span>
                  <span className="fiat-card-value">{cashoutData.nessie.formattedBalance || '$0.00'}</span>
                </div>
                <div className="fiat-card">
                  <span className="fiat-card-label">Total Cashed Out</span>
                  <span className="fiat-card-value">{cashoutData.stats?.formattedTotal || '$0.00'}</span>
                </div>
                <div className="fiat-card">
                  <span className="fiat-card-label">Cashouts</span>
                  <span className="fiat-card-value">{cashoutData.stats?.totalCount || 0}</span>
                </div>
              </div>

              {/* Recent Cashouts */}
              {cashoutData.recentCashouts && cashoutData.recentCashouts.length > 0 && (
                <div className="cashout-list">
                  <h3 className="cashout-list-title">Recent Cashouts</h3>
                  {cashoutData.recentCashouts.map((cashout, index) => (
                    <motion.div
                      key={cashout.id}
                      className="cashout-item"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.9 + index * 0.1 }}
                    >
                      <div className="cashout-icon">$</div>
                      <div className="cashout-details">
                        <span className="cashout-desc">
                          {cashout.invoiceNumber ? `Invoice #${cashout.invoiceNumber}` : 'Invoice Payment'}
                          {cashout.clientName && ` - ${cashout.clientName}`}
                        </span>
                        <span className="cashout-meta">
                          {cashout.completedAt ? formatRelativeTime(cashout.completedAt) : 'Processing'}
                          {cashout.isSimulated && ' (Demo)'}
                        </span>
                      </div>
                      <div className="cashout-amount">
                        <span className="cashout-value">{cashout.formattedAmount}</span>
                        <span className={`cashout-status ${cashout.status.toLowerCase()}`}>
                          {cashout.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {(!cashoutData.recentCashouts || cashoutData.recentCashouts.length === 0) && (
                <div className="cashout-empty">
                  <p>No cashouts yet</p>
                  <p className="cashout-empty-hint">USD settlements will appear here</p>
                </div>
              )}
            </div>
          ) : (
            <div className="fiat-not-connected">
              <div className="fiat-not-connected-icon">$</div>
              <h3>Connect Bank Account</h3>
              <p>Link your Nessie account to enable automatic USD settlements</p>
              <button
                className="fiat-connect-btn"
                onClick={() => router.push('/settings')}
              >
                Connect in Settings
              </button>
            </div>
          )}
          </motion.section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
