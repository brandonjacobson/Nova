'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import './Profile.css';

const Profile = () => {
  const [userName, setUserName] = useState('Alex');
  const [email, setEmail] = useState('alex@nova.finance');
  const [companyName, setCompanyName] = useState('Acme Corp');
  const [dateJoined] = useState('January 15, 2026');
  const [profileImage, setProfileImage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);

  // Load saved data from localStorage on mount
  useEffect(() => {
    const savedUserName = localStorage.getItem('userName');
    const savedEmail = localStorage.getItem('email');
    const savedCompanyName = localStorage.getItem('companyName');
    const savedProfileImage = localStorage.getItem('profileImage');

    if (savedUserName) setUserName(savedUserName);
    if (savedEmail) setEmail(savedEmail);
    if (savedCompanyName) setCompanyName(savedCompanyName);
    if (savedProfileImage) setProfileImage(savedProfileImage);
  }, []);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
        localStorage.setItem('profileImage', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    localStorage.setItem('userName', userName);
    localStorage.setItem('email', email);
    localStorage.setItem('companyName', companyName);
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Restore from localStorage
    const savedUserName = localStorage.getItem('userName') || 'Alex';
    const savedEmail = localStorage.getItem('email') || 'alex@nova.finance';
    const savedCompanyName = localStorage.getItem('companyName') || 'Acme Corp';
    setUserName(savedUserName);
    setEmail(savedEmail);
    setCompanyName(savedCompanyName);
    setIsEditing(false);
  };

  return (
    <div className="profile-page">
      {/* Back Button */}
      <motion.button
        className="back-btn"
        onClick={() => window.location.href = '/dashboard'}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ x: -4 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5"></path>
          <path d="M12 19l-7-7 7-7"></path>
        </svg>
        Back to Dashboard
      </motion.button>

      <div className="profile-container">
        <motion.div
          className="profile-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="profile-title">Profile</h1>

          {/* Profile Picture Section */}
          <div className="profile-picture-section">
            <div className="profile-picture-wrapper" onClick={handleImageClick}>
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="profile-picture" />
              ) : (
                <div className="profile-picture-placeholder">
                  {userName.charAt(0)}
                </div>
              )}
              <div className="profile-picture-overlay">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                <span>Edit</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="profile-picture-input"
              />
            </div>
            <p className="profile-picture-hint">Click to upload a new photo</p>
          </div>

          {/* Profile Info */}
          <div className="profile-info">
            <div className="profile-field">
              <label className="profile-label">Name</label>
              {isEditing ? (
                <input
                  type="text"
                  className="profile-input"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              ) : (
                <div className="profile-value">{userName}</div>
              )}
            </div>

            <div className="profile-field">
              <label className="profile-label">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  className="profile-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              ) : (
                <div className="profile-value">{email}</div>
              )}
            </div>

            <div className="profile-field">
              <label className="profile-label">Company Name</label>
              {isEditing ? (
                <input
                  type="text"
                  className="profile-input"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              ) : (
                <div className="profile-value">{companyName}</div>
              )}
            </div>

            <div className="profile-field">
              <label className="profile-label">Date Joined</label>
              <div className="profile-value">{dateJoined}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="profile-actions">
            {isEditing ? (
              <>
                <motion.button
                  className="profile-btn secondary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                >
                  Save Changes
                </motion.button>
                <motion.button
                  className="profile-btn cancel"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCancel}
                >
                  Cancel
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  className="profile-btn secondary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </motion.button>
                <motion.button
                  className="profile-btn danger"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.location.href = '/'}
                >
                  Log Out
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
