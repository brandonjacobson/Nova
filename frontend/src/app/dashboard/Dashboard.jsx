'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import './Dashboard.css';

const SidebarNovaLetters = () => {
  const [hoveredIndex, setHoveredIndex] = React.useState(null);
  const [offsets, setOffsets] = React.useState({ x: 0, y: 0 });
  const svgRef = React.useRef(null);

  const letterPositions = [
    { x: 155, y: 125 },
    { x: 240, y: 103 },
    { x: 330, y: 95 },
    { x: 415, y: 103 }
  ];

  const handleMouseMove = (e, index) => {
    const svg = svgRef.current;
    if (!svg) return;

    setHoveredIndex(index);

    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const letterPos = letterPositions[index];
    const scaleX = rect.width / 600;
    const scaleY = rect.height / 200;

    const letterScreenX = letterPos.x * scaleX;
    const letterScreenY = letterPos.y * scaleY;

    const deltaX = (letterScreenX - mouseX) * 0.4;
    const deltaY = (letterScreenY - mouseY) * 0.4;

    setOffsets({
      x: Math.max(-40, Math.min(40, deltaX)),
      y: Math.max(-40, Math.min(40, deltaY))
    });
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setOffsets({ x: 0, y: 0 });
  };

  return (
    <svg
      ref={svgRef}
      className="sidebar-logo-svg"
      viewBox="0 0 600 200"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: 'auto', minHeight: '80px' }}
      onMouseLeave={handleMouseLeave}
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

      {['N', 'O', 'V', 'A'].map((char, index) => {
        const isHovered = hoveredIndex === index;

        return (
          <motion.g
            key={index}
            initial={{ x: 0, y: 0 }}
            animate={{
              x: isHovered ? offsets.x : 0,
              y: isHovered ? offsets.y : 0
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            onMouseMove={(e) => handleMouseMove(e, index)}
            onMouseLeave={handleMouseLeave}
            style={{ pointerEvents: 'all' }}
          >
            <text
              className="sidebar-curved-text"
              fill="url(#silverGradientSidebar)"
            >
              <textPath
                href="#curvedTextPathSidebar"
                startOffset={`${[26, 44, 59, 74][index]}%`}
                textAnchor="middle"
              >
                {char}
              </textPath>
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
};

const Dashboard = () => {
  const [userName, setUserName] = useState('Alex');
  const [userEmail, setUserEmail] = useState('demo@nova.app');
  const [businessName, setBusinessName] = useState('Acme Corp');
  const [profileImage, setProfileImage] = useState(null);
  const [hoveredWidget, setHoveredWidget] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [time, setTime] = useState(new Date());

  // Load saved data from localStorage on mount
  useEffect(() => {
    const savedUserName = localStorage.getItem('userName');
    const savedEmail = localStorage.getItem('email');
    const savedCompanyName = localStorage.getItem('companyName');
    const savedProfileImage = localStorage.getItem('profileImage');

    if (savedUserName) setUserName(savedUserName);
    if (savedEmail) setUserEmail(savedEmail);
    if (savedCompanyName) setBusinessName(savedCompanyName);
    if (savedProfileImage) setProfileImage(savedProfileImage);
  }, []);

  const initialWidgets = [
    { id: 'total-revenue', title: 'TOTAL REVENUE', value: '$38,100.00', change: '', positive: null, trend: [200, 220, 210, 240, 260, 275, 284] },
    { id: 'this-month', title: 'THIS MONTH', value: '$21,100.00', change: '', positive: null, trend: [25, 30, 32, 35, 38, 40, 42] },
    { id: 'pending', title: 'PENDING PAYMENTS', value: '2', change: 'Awaiting payment', positive: null, trend: [5, 8, 7, 9, 8, 10, 8] },
    { id: 'draft-invoices', title: 'DRAFT INVOICES', value: '2', change: 'Not sent yet', positive: null, trend: [8, 9, 10, 11, 11, 12, 12] },
    { id: 'sent-invoices', title: 'SENT INVOICES', value: '2', change: 'Awaiting payment', positive: null, trend: [30, 35, 38, 40, 42, 45, 47] },
    { id: 'paid-invoices', title: 'PAID INVOICES', value: '4', change: 'Completed', positive: true, trend: [120, 130, 135, 142, 148, 152, 156] },
  ];

  const [widgets, setWidgets] = useState(initialWidgets);
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [activeNav, setActiveNav] = useState('dashboard');

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Track mouse position for parallax effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '◫' },
    { id: 'invoices', label: 'Invoices', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <line x1="10" y1="9" x2="8" y2="9"></line>
      </svg>
    )},
    { id: 'payments', label: 'Payments', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="6" x2="12" y2="18"></line>
        <path d="M15 8H10.5a2.5 2.5 0 0 0 0 5H13.5a2.5 2.5 0 0 1 0 5H9"></path>
      </svg>
    )},
    { id: 'settings', label: 'Settings', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    )},
  ];

  return (
    <div className="dashboard-page">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <button
          className="sidebar-logo"
          onClick={() => window.location.href = '/dashboard'}
          style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
        >
          <SidebarNovaLetters />
        </button>

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

        {/* Sidebar Footer - Profile */}
        <div className="sidebar-footer">
          <div
            className="sidebar-user-info"
            onClick={() => window.location.href = '/profile'}
            style={{ cursor: 'pointer' }}
          >
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="sidebar-user-avatar-img" />
            ) : (
              <div className="sidebar-user-avatar">{userName.charAt(0)}</div>
            )}
            <div className="sidebar-user-details">
              <span className="sidebar-user-name">{userName}</span>
              <span className="sidebar-user-email">{userEmail}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Land Horizon Background */}
        <div className="dashboard-land-container">
          <svg
            className="dashboard-land-svg"
            viewBox="0 0 1440 800"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Land fill gradient - ambient white */}
              <linearGradient id="landFillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.12" />
              </linearGradient>

              {/* Horizon line gradient */}
              <linearGradient id="horizonLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
                <stop offset="15%" stopColor="#ffffff" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.8" />
                <stop offset="85%" stopColor="#ffffff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
              </linearGradient>

              {/* Texture pattern for land - removed */}
              <pattern id="landTexture" x="0" y="0" width="150" height="150" patternUnits="userSpaceOnUse">
              </pattern>

              {/* Glow filter */}
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

            {/* Main horizon line */}
            <path
              d="M 0 450 Q 720 390 1440 450"
              stroke="url(#horizonLineGradient)"
              strokeWidth="2"
              fill="none"
              filter="url(#horizonGlow)"
            />

            {/* Secondary subtle horizon line */}
            <path
              d="M 0 460 Q 720 400 1440 460"
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
            <h1 className="welcome-title">Welcome to your Frontier, {userName}</h1>
            <p className="welcome-subtitle">{businessName} Dashboard</p>
          </motion.div>

          <motion.button
            className="new-invoice-btn"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(255, 255, 255, 0.2)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.location.href = '/invoices/new'}
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
                animate={{
                  opacity: 1,
                  y: 0
                }}
                transition={{
                  opacity: { duration: 0.4, delay: index * 0.1 },
                  y: { duration: 0.15, ease: "easeOut" }
                }}
                whileHover={draggedWidget ? {} : { y: -4 }}
                layout
                layoutId={widget.id}
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
                    <div className="widget-value">
                      {widget.value}
                    </div>

                    {widget.change && (
                      <div className={`widget-change ${widget.positive === true ? 'positive' : widget.positive === false ? 'negative' : widget.positive === 'green' ? 'positive' : 'neutral'}`}>
                        {widget.change}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ripple effect on click */}
                <div className="widget-ripple" />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="activity-section">
          <div className="activity-header">
            <h2 className="section-title">Recent Activity</h2>
          </div>
          <div className="activity-list">
            {[
              { type: 'payment', desc: 'Payment received from Acme Corp', amount: '+$4,500.00', time: '2 hours ago', status: 'completed' },
              { type: 'invoice', desc: 'Invoice #1047 sent to TechStart Inc', amount: '$2,800.00', time: '5 hours ago', status: 'pending' },
              { type: 'payment', desc: 'Payment received from Global Dynamics', amount: '+$12,350.00', time: '1 day ago', status: 'completed' },
              { type: 'invoice', desc: 'Invoice #1046 sent to Stellar Systems', amount: '$5,200.00', time: '1 day ago', status: 'completed' },
              { type: 'payment', desc: 'Payment received from Mercury Labs', amount: '+$8,750.00', time: '2 days ago', status: 'completed' },
            ].map((activity, index) => (
              <div
                key={index}
                className="activity-item"
              >
                <div className={`activity-icon ${activity.type}`}>
                  {activity.type === 'payment' ? '↓' : '↗'}
                </div>
                <div className="activity-details">
                  <span className="activity-desc">{activity.desc}</span>
                  <div className="activity-meta">
                    <span className="activity-time">{activity.time}</span>
                    <span className={`activity-status ${activity.status}`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
                <div className={`activity-amount ${activity.type === 'payment' ? 'positive' : ''}`}>
                  {activity.amount}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
