'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Home() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const res = await fetch(`${API_BASE}/invoices`);
        const data = await res.json();
        setInvoices(data.invoices || []);
      } catch (err) {
        console.error('Error fetching invoices:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchInvoices();
  }, []);

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Crypto Invoicing Dashboard</h1>
      <p>Backend: {API_BASE}</p>

      {loading ? (
        <p>Loading invoices...</p>
      ) : (
        <>
          {invoices.length === 0 ? (
            <p>No invoices yet.</p>
          ) : (
            <ul>
              {invoices.map((inv) => (
                <li key={inv.id}>{inv.id}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
