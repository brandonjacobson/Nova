'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import './Sidebar.css';

// ===== SIDEBAR NOVA LETTERS (Interactive Animated Logo) =====
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
      viewBox="0 0 600 220"
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
        <linearGradient id="arcGradientSidebar" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="15%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="85%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
        </linearGradient>
        <filter id="sidebarArcGlow" x="-20%" y="-100%" width="140%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
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

      {/* Arc below NOVA text */}
      <path
        d="M 50 175 Q 300 145 550 175"
        stroke="url(#arcGradientSidebar)"
        strokeWidth="1.5"
        fill="none"
        filter="url(#sidebarArcGlow)"
      />
    </svg>
  );
};

// Navigation items configuration
const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <span className="nav-icon-text">◫</span>
    ),
    path: '/dashboard'
  },
  {
    id: 'invoices',
    label: 'Invoices',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <line x1="10" y1="9" x2="8" y2="9"></line>
      </svg>
    ),
    path: '/invoices'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    ),
    path: '/settings'
  },
];

// ===== MAIN SIDEBAR COMPONENT =====
const Sidebar = ({ user, onLogout }) => {
  const router = useRouter();
  const pathname = usePathname();

  // Get current nav item based on pathname
  const getActiveNav = () => {
    if (pathname.startsWith('/invoices')) return 'invoices';
    if (pathname.startsWith('/settings')) return 'settings';
    if (pathname.startsWith('/profile')) return 'profile';
    return 'dashboard';
  };

  const activeNav = getActiveNav();

  const handleNavClick = (item) => {
    router.push(item.path);
  };

  const handleProfileClick = () => {
    router.push('/profile');
  };

  return (
    <aside className="sidebar">
      {/* Logo - Interactive NOVA Letters */}
      <button
        className="sidebar-logo"
        onClick={() => router.push('/dashboard')}
        style={{ cursor: 'pointer', background: 'none', border: 'none', padding: '8px 12px 16px' }}
      >
        <SidebarNovaLetters />
      </button>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <motion.button
            key={item.id}
            className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
            onClick={() => handleNavClick(item)}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </motion.button>
        ))}
      </nav>

      {/* Sidebar Footer - User Profile */}
      <div className="sidebar-footer">
        <div
          className="sidebar-user-info"
          onClick={handleProfileClick}
          style={{ cursor: 'pointer' }}
        >
          <div className="sidebar-user-avatar">{user?.name?.charAt(0) || 'U'}</div>
          <div className="sidebar-user-details">
            <span className="sidebar-user-name">{user?.name || 'User'}</span>
          </div>
          <button
            className="sidebar-profile-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleProfileClick();
            }}
            title="Profile / Sign Out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7"></line>
              <polyline points="7 7 17 7 17 17"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
