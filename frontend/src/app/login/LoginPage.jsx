'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Redirect to dashboard after login
    window.location.href = '/dashboard';
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* NOVA Logo */}
        <motion.div
          className="login-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <svg
            className="login-logo-svg"
            viewBox="0 0 600 200"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="silverGradientLogin" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e8e8e8" />
                <stop offset="20%" stopColor="#b8b8b8" />
                <stop offset="40%" stopColor="#d4d4d4" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="60%" stopColor="#c0c0c0" />
                <stop offset="80%" stopColor="#a8a8a8" />
                <stop offset="100%" stopColor="#d0d0d0" />
              </linearGradient>

              <filter id="textGlowLogin" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <path
                id="curvedTextPathLogin"
                d="M 50 160 Q 300 80 550 160"
                fill="none"
              />
            </defs>

            <text
              className="login-curved-text"
              fill="url(#silverGradientLogin)"
              filter="url(#textGlowLogin)"
            >
              <textPath
                href="#curvedTextPathLogin"
                startOffset="50%"
                textAnchor="middle"
              >
                NOVA
              </textPath>
            </text>
          </svg>
          <p className="login-subtitle">Welcome Back</p>
        </motion.div>

        {/* Login Form */}
        <motion.form
          className="login-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <motion.button
            type="submit"
            className="login-button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Sign In
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>

          <div className="login-footer">
            <a href="/" className="back-link">← Back to Home</a>
            <a href="/signup" className="signup-link">Create Account</a>
          </div>
        </motion.form>
      </div>
    </div>
  );
};

export default LoginPage;
