'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import './Dashboard.css';

const Dashboard = () => {
  const [userName] = useState('Alex');

  const initialWidgets = [
    { id: 'available', title: 'Available Balance', value: '$24,580.00', change: '+12.5%', positive: true },
    { id: 'pending', title: 'Pending Balance', value: '$8,320.00', change: '3 pending', positive: null },
    { id: 'paid', title: 'Paid (Last 30 Days)', value: '$142,890.00', change: '+23.1%', positive: true },
    { id: 'overdue', title: 'Overdue Amount', value: '$2,150.00', change: '2 invoices', positive: false },
    { id: 'invoices', title: 'Invoices Sent', value: '47', change: '+8 this week', positive: true },
    { id: 'settlement', title: 'Average Settlement Time', value: '2.4 days', change: '-0.5 days', positive: true },
  ];

  const [widgets, setWidgets] = useState(initialWidgets);
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [activeNav, setActiveNav] = useState('dashboard');

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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '◫' },
    { id: 'invoices', label: 'Manage Invoices', icon: '◧' },
    { id: 'payments', label: 'Manage Payments', icon: '◨' },
    { id: 'profile', label: 'Profile', icon: '○' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
  ];

  return (
    <div className="dashboard-page">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <svg
            className="sidebar-logo-svg"
            viewBox="0 0 600 200"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="silverGradientSidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e8e8e8" />
                <stop offset="20%" stopColor="#b8b8b8" />
                <stop offset="40%" stopColor="#d4d4d4" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="60%" stopColor="#c0c0c0" />
                <stop offset="80%" stopColor="#a8a8a8" />
                <stop offset="100%" stopColor="#d0d0d0" />
              </linearGradient>
              <path
                id="curvedTextPathSidebar"
                d="M 50 140 Q 300 80 550 140"
                fill="none"
              />
            </defs>
            <text
              className="sidebar-curved-text"
              fill="url(#silverGradientSidebar)"
            >
              <textPath
                href="#curvedTextPathSidebar"
                startOffset="50%"
                textAnchor="middle"
              >
                NOVA
              </textPath>
            </text>
          </svg>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </motion.button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{userName.charAt(0)}</div>
            <div className="user-details">
              <span className="user-name">{userName}</span>
              <span className="user-email">alex@nova.finance</span>
            </div>
          </div>
          <button className="logout-btn" onClick={() => window.location.href = '/'}>
            ↗
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="content-header">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="welcome-title">Welcome back, {userName}</h1>
            <p className="welcome-subtitle">Here's what's happening with your finances today.</p>
          </motion.div>

          <div className="header-actions">
            <motion.button
              className="action-btn primary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              + New Invoice
            </motion.button>
          </div>
        </header>

        {/* Widgets Grid */}
        <section className="widgets-section">
          <div className="widgets-grid">
            {widgets.map((widget, index) => (
              <motion.div
                key={widget.id}
                className={`widget-card ${draggedWidget?.id === widget.id ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, widget)}
                onDragOver={(e) => handleDragOver(e, widget)}
                onDragEnd={handleDragEnd}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                {/* Ambient glow effect */}
                <div className="widget-glow" />

                <div className="widget-content">
                  <div className="widget-header">
                    <span className="widget-title">{widget.title}</span>
                    <span className="widget-drag-handle">⋮⋮</span>
                  </div>
                  <div className="widget-value">{widget.value}</div>
                  <div className={`widget-change ${widget.positive === true ? 'positive' : widget.positive === false ? 'negative' : 'neutral'}`}>
                    {widget.change}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Recent Activity Placeholder */}
        <section className="activity-section">
          <h2 className="section-title">Recent Activity</h2>
          <div className="activity-list">
            {[
              { type: 'payment', desc: 'Payment received from Acme Corp', amount: '+$4,500.00', time: '2 hours ago' },
              { type: 'invoice', desc: 'Invoice #1047 sent to TechStart Inc', amount: '$2,800.00', time: '5 hours ago' },
              { type: 'payment', desc: 'Payment received from Global Dynamics', amount: '+$12,350.00', time: '1 day ago' },
            ].map((activity, index) => (
              <motion.div
                key={index}
                className="activity-item"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
              >
                <div className="activity-icon">
                  {activity.type === 'payment' ? '↓' : '↗'}
                </div>
                <div className="activity-details">
                  <span className="activity-desc">{activity.desc}</span>
                  <span className="activity-time">{activity.time}</span>
                </div>
                <div className={`activity-amount ${activity.type === 'payment' ? 'positive' : ''}`}>
                  {activity.amount}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
