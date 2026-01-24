'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import './LandingPage.css';

const LandingPage = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Horizon SHRINKS as user scrolls (starts large, gets smaller)
  const horizonScaleX = useTransform(scrollYProgress, [0, 0.6], [1, 0.3]);
  const horizonScaleY = useTransform(scrollYProgress, [0, 0.6], [1, 0.4]);
  const horizonOpacity = useTransform(scrollYProgress, [0, 0.4, 0.6], [1, 0.8, 0.3]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.4], [0.6, 0.2]);

  return (
    <div className="landing-page" ref={containerRef}>
      {/* White Horizon Arc - Separating NOVA from tagline */}
      <div className="horizon-container">
        <motion.div
          className="horizon-wrapper"
          style={{
            scaleX: horizonScaleX,
            scaleY: horizonScaleY,
            opacity: horizonOpacity,
          }}
        >
          {/* Soft white glow behind the arc */}
          <motion.div
            className="horizon-glow"
            style={{ opacity: glowOpacity }}
          />

          {/* The curved horizon line SVG - full width */}
          <svg
            className="horizon-svg"
            viewBox="0 0 1440 200"
            preserveAspectRatio="none"
          >
            <defs>
              {/* White gradient with soft fade at edges */}
              <linearGradient id="horizonWhite" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
                <stop offset="15%" stopColor="#ffffff" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="85%" stopColor="#ffffff" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
              </linearGradient>

              {/* Glow filter */}
              <filter id="arcGlow" x="-20%" y="-100%" width="140%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Main arc - touches both sides */}
            <path
              d="M 0 200 Q 720 -50 1440 200"
              fill="none"
              stroke="url(#horizonWhite)"
              strokeWidth="2"
              filter="url(#arcGlow)"
            />

            {/* Subtle secondary arc */}
            <path
              d="M 0 200 Q 720 -30 1440 200"
              fill="none"
              stroke="url(#horizonWhite)"
              strokeWidth="0.5"
              opacity="0.4"
            />
          </svg>
        </motion.div>
      </div>

      <div className="content-container">
        {/* Hero Section */}
        <section className="hero-section">
          {/* Curved NOVA Logo - Above the horizon */}
          <motion.div
            className="hero-top"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          >
            <svg
              className="nova-logo-svg"
              viewBox="0 0 600 200"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Luxurious silver gradient */}
                <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e8e8e8" />
                  <stop offset="20%" stopColor="#b8b8b8" />
                  <stop offset="40%" stopColor="#d4d4d4" />
                  <stop offset="50%" stopColor="#ffffff" />
                  <stop offset="60%" stopColor="#c0c0c0" />
                  <stop offset="80%" stopColor="#a8a8a8" />
                  <stop offset="100%" stopColor="#d0d0d0" />
                </linearGradient>

                {/* Subtle text glow */}
                <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Curved path for text - gentle upward arc */}
                <path
                  id="curvedTextPath"
                  d="M 50 160 Q 300 80 550 160"
                  fill="none"
                />
              </defs>

              {/* NOVA text following the curved path */}
              <text
                className="nova-curved-text"
                fill="url(#silverGradient)"
                filter="url(#textGlow)"
              >
                <textPath
                  href="#curvedTextPath"
                  startOffset="50%"
                  textAnchor="middle"
                >
                  NOVA
                </textPath>
              </text>
            </svg>
          </motion.div>

          {/* Tagline - Below the horizon */}
          <motion.div
            className="hero-bottom"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
          >
            <p className="tagline">The Financial Frontier</p>
            <p className="tagline-accent">Rebuilt for Crypto</p>

            <motion.button
              className="cta-button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.href = '/login'}
            >
              Get Started
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.button>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="scroll-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.5 }}
          >
            <span>Scroll</span>
            <div className="scroll-line" />
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="section-title">Everything you need</h2>
            <p className="section-subtitle">
              Powerful tools for modern crypto commerce
            </p>
          </motion.div>

          <div className="features-grid">
            {[
              {
                icon: '⭐',
                title: 'Stellar Settlement',
                description: 'Fast, transparent crypto payments on-chain.'
              },
              {
                icon: '🛰️',
                title: 'Mission Control',
                description: 'Monitor payments and transactions in real time.'
              },
              {
                icon: '🚀',
                title: 'Launch Payments',
                description: 'Send and receive crypto in just a few clicks.'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="feature-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
              >
                <div className="card-icon-wrapper">
                  <div className="card-icon">{feature.icon}</div>
                </div>
                <h3 className="card-title">{feature.title}</h3>
                <p className="card-description">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <motion.footer
          className="footer"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="footer-content">
            <div className="footer-logo">NOVA</div>
            <p className="footer-text">
              Building the future of crypto payments
            </p>
          </div>
        </motion.footer>
      </div>
    </div>
  );
};

export default LandingPage;
