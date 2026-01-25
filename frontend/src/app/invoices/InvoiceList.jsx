'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import './InvoiceList.css';

const STATUS_COLORS = {
  DRAFT: 'status-draft',
  SENT: 'status-sent',
  PENDING: 'status-pending',
  PAID_DETECTED: 'status-paid',
  CONVERTING: 'status-converting',
  SETTLING: 'status-settling',
  CASHED_OUT: 'status-cashed',
  COMPLETE: 'status-complete',
  CANCELLED: 'status-cancelled',
  FAILED: 'status-failed',
};

const STATUS_LABELS = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PENDING: 'Pending',
  PAID_DETECTED: 'Paid',
  CONVERTING: 'Converting',
  SETTLING: 'Settling',
  CASHED_OUT: 'Cashed Out',
  COMPLETE: 'Complete',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
};

const InvoiceList = () => {
  const { user } = useAuth();
  const router = useRouter();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  // Format currency
  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Fetch invoices
  const fetchInvoices = async (page = 1, status = null) => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (status && status !== 'all') {
        params.status = status;
      }
      const response = await api.invoices.list(params);
      const data = response.data || {};
      setInvoices(data.invoices || []);
      setPagination({
        page: data.pagination?.page || 1,
        totalPages: data.pagination?.pages || 1,
        total: data.pagination?.total || 0,
      });
      setError(null);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(1, filter);
  }, [filter]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    fetchInvoices(newPage, filter);
  };

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'DRAFT', label: 'Drafts' },
    { value: 'SENT,PENDING', label: 'Awaiting Payment' },
    { value: 'PAID_DETECTED,CONVERTING,SETTLING,CASHED_OUT', label: 'In Progress' },
    { value: 'COMPLETE,CANCELLED,FAILED', label: 'Completed' },
  ];

  return (
    <div className="invoices-page">
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
            <h1 className="page-title">Invoices</h1>
            <p className="page-subtitle">Manage and track your invoices</p>
          </motion.div>

          <motion.button
            className="new-invoice-btn"
            whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(255, 255, 255, 0.2)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/invoices/new')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Invoice
          </motion.button>
        </header>

        {/* Filters */}
        <div className="filters-bar">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              className={`filter-btn ${filter === option.value ? 'active' : ''}`}
              onClick={() => handleFilterChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Invoice Table */}
        <section className="invoices-section">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner" />
              <p>Loading invoices...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p>Error loading invoices: {error}</p>
              <button onClick={() => fetchInvoices(1, filter)} className="retry-btn">
                Retry
              </button>
            </div>
          ) : invoices.length === 0 ? (
            <div className="empty-container">
              <div className="empty-icon">◧</div>
              <h3>No invoices found</h3>
              <p>Create your first invoice to get started</p>
              <motion.button
                className="action-btn primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/invoices/new')}
              >
                + Create Invoice
              </motion.button>
            </div>
          ) : (
            <>
              <div className="invoices-table">
                <div className="table-header">
                  <div className="th invoice-number">Invoice #</div>
                  <div className="th client">Client</div>
                  <div className="th amount">Amount</div>
                  <div className="th status">Status</div>
                  <div className="th date">Date</div>
                  <div className="th actions">Actions</div>
                </div>

                {invoices.map((invoice, index) => (
                  <motion.div
                    key={invoice._id}
                    className="table-row"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    onClick={() => router.push(`/invoices/${invoice._id}`)}
                  >
                    <div className="td invoice-number">
                      <span className="invoice-number-text">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="td client">
                      <span className="client-name">{invoice.clientName}</span>
                      <span className="client-email">{invoice.clientEmail}</span>
                    </div>
                    <div className="td amount">{formatCurrency(invoice.total)}</div>
                    <div className="td status">
                      <span className={`status-badge ${STATUS_COLORS[invoice.status]}`}>
                        {STATUS_LABELS[invoice.status] || invoice.status}
                      </span>
                    </div>
                    <div className="td date">{formatDate(invoice.issueDate)}</div>
                    <div className="td actions">
                      <button
                        className="action-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/invoices/${invoice._id}`);
                        }}
                        title="View"
                      >
                        →
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-btn"
                    disabled={pagination.page <= 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    ← Previous
                  </button>
                  <span className="pagination-info">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    className="pagination-btn"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default InvoiceList;
