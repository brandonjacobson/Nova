'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import './LoginPage.css';

const LoginNovaLetters = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [offsets, setOffsets] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  const letterPositions = [
    { x: 150, y: 128 },
    { x: 250, y: 100 },
    { x: 340, y: 93 },
    { x: 425, y: 100 }
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

    const deltaX = (letterScreenX - mouseX) * 0.6;
    const deltaY = (letterScreenY - mouseY) * 0.6;

    setOffsets({
      x: Math.max(-70, Math.min(70, deltaX)),
      y: Math.max(-70, Math.min(70, deltaY))
    });
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setOffsets({ x: 0, y: 0 });
  };

  const floatConfigs = [
    { duration: 3, delay: 0, amount: 4 },
    { duration: 3.5, delay: 0.4, amount: 5 },
    { duration: 4, delay: 0.8, amount: 4 },
    { duration: 3.7, delay: 1.2, amount: 5 }
  ];

  return (
    <svg
      ref={svgRef}
      className="login-logo-svg"
      viewBox="0 0 600 200"
      preserveAspectRatio="xMidYMid meet"
      onMouseLeave={handleMouseLeave}
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

      {['N', 'O', 'V', 'A'].map((char, index) => {
        const config = floatConfigs[index];
        const isHovered = hoveredIndex === index;

        return (
          <motion.g
            key={char}
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
            <motion.text
              className="login-curved-text login-letter"
              fill="url(#silverGradientLogin)"
              filter="url(#textGlowLogin)"
              animate={{ y: [0, -config.amount, 0] }}
              transition={{
                duration: config.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: config.delay
              }}
            >
              <textPath
                href="#curvedTextPathLogin"
                startOffset={`${[26, 44, 59, 74][index]}%`}
                textAnchor="middle"
              >
                {char}
              </textPath>
            </motion.text>
          </motion.g>
        );
      })}
    </svg>
  );
};

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const horizonScaleX = useTransform(scrollYProgress, [0, 0.6], [1, 0.3]);
  const horizonScaleY = useTransform(scrollYProgress, [0, 0.6], [1, 0.4]);
  const horizonOpacity = useTransform(scrollYProgress, [0, 0.4, 0.6], [1, 0.8, 0.3]);
  const horizonY = useTransform(scrollYProgress, [0, 0.6], [0, 20]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.4], [0.6, 0.2]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const result = await login(email, password);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setErrorMessage(result.error || 'Login failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page" ref={containerRef}>
      <div className="login-container">
        {/* NOVA Logo */}
        <motion.div
          className="login-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <LoginNovaLetters />
          <motion.div
            className="login-horizon"
            style={{
              scaleX: horizonScaleX,
              scaleY: horizonScaleY,
              opacity: horizonOpacity,
              y: horizonY,
            }}
          >
            <motion.div
              className="login-horizon-glow"
              style={{ opacity: glowOpacity }}
            />
            <svg
              className="login-horizon-svg"
              viewBox="0 0 1440 200"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="loginHorizonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
                  <stop offset="15%" stopColor="#ffffff" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
                  <stop offset="85%" stopColor="#ffffff" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
                </linearGradient>
                <filter id="loginHorizonGlow" x="-20%" y="-100%" width="140%" height="300%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
                  <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                d="M 0 200 Q 720 -50 1440 200"
                fill="none"
                stroke="url(#loginHorizonGradient)"
                strokeWidth="2"
                filter="url(#loginHorizonGlow)"
              />
              <path
                d="M 0 200 Q 720 -30 1440 200"
                fill="none"
                stroke="url(#loginHorizonGradient)"
                strokeWidth="0.5"
                opacity="0.4"
              />
            </svg>
          </motion.div>
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
          </div>

          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}

          <motion.button
            type="submit"
            className="login-button"
            whileHover={!isSubmitting ? { scale: 1.02 } : {}}
            whileTap={!isSubmitting ? { scale: 0.98 } : {}}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </motion.button>

          <div className="login-footer">
            <a href="/" className="back-link">← Back to Home</a>
            <a href="/register" className="signup-link">Create Account</a>
          </div>
        </motion.form>
      </div>
    </div>
  );
};

export default LoginPage;
