// API service layer - connects the React frontend to the backend API server
// The backend server runs on port 3001 and queries the Neon database

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'All' && !value.startsWith('All ')) {
      params.set(key, value);
    }
  });
  return params.toString() ? `?${params.toString()}` : '';
}

// ── EXPENSES ──────────────────────────────────────────────────────────
export async function fetchTransactions(filters = {}) {
  const res = await fetch(`${API_BASE}/api/transactions${buildQuery(filters)}`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

export async function fetchSummary(filters = {}) {
  const res = await fetch(`${API_BASE}/api/summary${buildQuery(filters)}`);
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
}

export async function fetchMonthlyData(filters = {}) {
  const res = await fetch(`${API_BASE}/api/monthly${buildQuery(filters)}`);
  if (!res.ok) throw new Error('Failed to fetch monthly data');
  return res.json();
}

export async function fetchFilterOptions(filters = {}) {
  const res = await fetch(`${API_BASE}/api/filter-options${buildQuery(filters)}`);
  if (!res.ok) throw new Error('Failed to fetch filter options');
  return res.json();
}

export async function fetchStatusBreakdown() {
  const res = await fetch(`${API_BASE}/api/status-breakdown`);
  if (!res.ok) throw new Error('Failed to fetch status breakdown');
  return res.json();
}

export async function fetchTopAccounts(view = 'expenses', filters = {}) {
  const query = buildQuery(filters);
  const prefix = query ? `${query}&view=${view}` : `?view=${view}`;
  const res = await fetch(`${API_BASE}/api/top-accounts${prefix}`);
  if (!res.ok) throw new Error('Failed to fetch top accounts');
  return res.json();
}

export async function fetchBreakdown(view, filters = {}) {
  const query = buildQuery(filters);
  const prefix = query ? `${query}&view=${view}` : `?view=${view}`;
  const res = await fetch(`${API_BASE}/api/breakdown${prefix}`);
  if (!res.ok) throw new Error('Failed to fetch breakdown');
  return res.json();
}

// ── REVENUE ───────────────────────────────────────────────────────────
export async function fetchRevenueTransactions(filters = {}) {
  const res = await fetch(`${API_BASE}/api/revenue/transactions${buildQuery(filters)}`);
  if (!res.ok) throw new Error('Failed to fetch revenue transactions');
  return res.json();
}

export async function fetchRevenueSummary(filters = {}) {
  const res = await fetch(`${API_BASE}/api/revenue/summary${buildQuery(filters)}`);
  if (!res.ok) throw new Error('Failed to fetch revenue summary');
  return res.json();
}

export async function fetchRevenueMonthly(filters = {}) {
  const res = await fetch(`${API_BASE}/api/revenue/monthly${buildQuery(filters)}`);
  if (!res.ok) throw new Error('Failed to fetch revenue monthly data');
  return res.json();
}

export async function fetchRevenueFilterOptions(filters = {}) {
  const res = await fetch(`${API_BASE}/api/revenue/filter-options${buildQuery(filters)}`);
  if (!res.ok) throw new Error('Failed to fetch revenue filter options');
  return res.json();
}

// ── P&L (Profit & Loss) ───────────────────────────────────────────
export async function fetchPnlSummary(filters = {}) {
  const res = await fetch(`${API_BASE}/api/pnl/summary${buildQuery(filters)}`);
  if (!res.ok) throw new Error('Failed to fetch P&L summary');
  return res.json();
}

export async function fetchPnlMonthly(filters = {}) {
  const res = await fetch(`${API_BASE}/api/pnl/monthly${buildQuery(filters)}`);
  if (!res.ok) throw new Error('Failed to fetch P&L monthly data');
  return res.json();
}

// ── MISC ──────────────────────────────────────────────────────────────
export async function fetchDbStatus() {
  const res = await fetch(`${API_BASE}/api/db-status`);
  if (!res.ok) throw new Error('Failed to fetch database status');
  return res.json();
}
