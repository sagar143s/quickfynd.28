"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function ProductSelect({ value, onChange, selectedIds = [], products: propProducts }) {
  const [products, setProducts] = useState(propProducts || []);
  const [loading, setLoading] = useState(!propProducts);
  const [localValue, setLocalValue] = useState('');

  useEffect(() => {
    if (!propProducts) {
      axios.get('/api/products')
        .then(res => setProducts(res.data.products || []))
        .catch(() => setProducts([]))
        .finally(() => setLoading(false));
    }
  }, [propProducts]);

  // Reset dropdown after selection
  useEffect(() => {
    if (localValue) setLocalValue('');
  }, [selectedIds]);

  return (
    <select
      className="w-full border rounded-lg px-3 py-2"
      value={localValue}
      onChange={e => {
        const val = e.target.value;
        if (val && !selectedIds.includes(val)) {
          onChange(val);
        }
        setLocalValue('');
      }}
      disabled={loading}
    >
      <option value="">{loading ? 'Loading products...' : 'Select a product'}</option>
      {products.map(p => (
        <option key={p.id} value={p.id} disabled={selectedIds.includes(p.id)}>
          {p.name.length > 40 ? p.name.slice(0, 40) + '…' : p.name}
        </option>
      ))}
    </select>
  );
}
