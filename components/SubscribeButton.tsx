'use client';

import { useState } from 'react';

export function SubscribeButton() {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      if (!res.ok) {
          throw new Error('Checkout failed');
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
          alert('Failed to start checkout');
      }
    } catch (e) {
      console.error(e);
      alert('Error starting checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
        onClick={handleSubscribe}
        disabled={loading}
        className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-lg transition-transform transform hover:scale-105"
    >
      {loading ? 'Wird weitergeleitet...' : 'Mitgliedschaft aktivieren (99€/Monat)'}
    </button>
  );
}
