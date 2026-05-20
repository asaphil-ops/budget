import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Wallet, TrendingUp, TrendingDown, BarChart3,
  Search, Download, Calendar,
  X, RefreshCw, Activity,
  ArrowUpRight, ArrowDownRight,
  ChevronDown, SlidersHorizontal, FileText,
  Sun, Moon, DollarSign, Scale, ArrowUp, ArrowDown
} from 'lucide-react';
import {
  fetchTransactions, fetchSummary, fetchMonthlyData,
  fetchStatusBreakdown, fetchTopAccounts, fetchBreakdown, fetchFilterOptions,
  fetchRevenueTransactions, fetchRevenueSummary, fetchRevenueMonthly, fetchRevenueFilterOptions,
  fetchPnlSummary, fetchPnlMonthly
} from './data/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899'];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-PH').format(value);
}

function fixDisplayText(value) {
  if (value === null || value === undefined) return '';

  return String(value)
    .replace(/\r?\n/g, '')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã‘/g, 'Ñ')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã¼/g, 'ü')
    .replace(/Para(?:ï¿½|�)aque/g, 'Parañaque')
    .replace(/Pi(?:ï¿½|�)as/g, 'Piñas')
    .replace(/Dasmari(?:ï¿½|�)as/g, 'Dasmariñas')
    .replace(/Bi(?:ï¿½|�)an/g, 'Biñan')
    .replace(/Ba(?:ï¿½|�)os/g, 'Baños')
    .replace(/Mu(?:ï¿½|�)oz/g, 'Muñoz')
    .replace(/Espa(?:ï¿½|�)ola/g, 'Española')
    .replace(/Due(?:ï¿½|�)as/g, 'Dueñas');
}

function escapeCsvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-xl">
        <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-sm">{fixDisplayText(label)}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm font-medium py-0.5" style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const StatCard = ({ icon: Icon, label, value, sublabel, trend, trendLabel, color, children }) => {
  const isPositive = trend === 'up';
  const bgMap = {
    blue: 'bg-blue-50/80 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20',
    red: 'bg-red-50/80 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-200/50 dark:border-red-500/20',
    yellow: 'bg-amber-50/80 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20',
    green: 'bg-emerald-50/80 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20',
  };

  return (
    <div className="group relative glass p-5 rounded-2xl hover:scale-[1.02] transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${bgMap[color]}`}>
          <Icon size={22} className="drop-shadow-sm" />
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-200/50 dark:border-red-500/20'}`}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trendLabel}
        </span>
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">{value}</p>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-300">{label}</p>
      <p className="text-xs text-slate-400 dark:text-slate-400 mt-1.5">{sublabel}</p>
      {children}
    </div>
  );
};

const FilterSelect = ({ label, value, onChange, options }) => (
  <div className="relative">
    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-1.5">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="w-full appearance-none bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-sm rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm dark:shadow-inner cursor-pointer"
      >
        {options.map((opt) => <option key={opt} value={opt} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">{fixDisplayText(opt)}</option>)}
      </select>
      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
    </div>
  </div>
);

export default function App() {
  const [theme, setTheme] = useState('light');
  const [viewMode, setViewMode] = useState('expenses'); // 'expenses' | 'revenue' | 'pnl'
  const [pnlSummary, setPnlSummary] = useState({});
  const [filters, setFilters] = useState({
    accountTitle: 'All Account Titles',
    month: 'All Months',
    operation: 'All Operations',
    division: 'All Divisions',
    region: 'All Regions',
    area: 'All Areas',
    branch: 'All Branches',
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Data states
  const [filterOptions, setFilterOptions] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({});
  const [monthlyData, setMonthlyData] = useState([]);
  const [accountPieData, setAccountPieData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [regionData, setRegionData] = useState([]);
  const [breakdownLabel, setBreakdownLabel] = useState('Operation');
  const [allTransactionsCount, setAllTransactionsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Scroll visibility handler
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  // Theme toggle effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    const fn = viewMode === 'revenue' ? fetchRevenueFilterOptions : fetchFilterOptions;
    fn({
      operation: filters.operation,
      division: filters.division,
      region: filters.region,
      area: filters.area,
      branch: filters.branch,
    })
      .then(data => setFilterOptions(data))
      .catch(err => console.error('Failed to load filter options:', err));
  }, [filters.operation, filters.division, filters.region, filters.area, filters.branch, viewMode]);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const activeFilters = {};
        Object.entries(filters).forEach(([key, value]) => {
          if (value && !value.startsWith('All ')) activeFilters[key] = value;
        });

        if (viewMode === 'expenses') {
          const [txns, smry, monthly, status, accounts, breakdownRes] = await Promise.all([
            fetchTransactions(activeFilters),
            fetchSummary(activeFilters),
            fetchMonthlyData(activeFilters),
            fetchStatusBreakdown(),
            fetchTopAccounts('expenses', activeFilters),
            fetchBreakdown('expenses', activeFilters),
          ]);
          if (cancelled) return;
          setTransactions(txns);
          setSummary(smry);
          setMonthlyData(monthly);
          setStatusData(status);
          setAccountPieData(accounts);
          setRegionData(breakdownRes.data);
          setBreakdownLabel(breakdownRes.label);
          const allSummary = await fetchSummary({});
          if (!cancelled) setAllTransactionsCount(allSummary.total_transactions || 0);
        } else if (viewMode === 'revenue') {
          const [txns, smry, monthly, accounts, breakdownRes] = await Promise.all([
            fetchRevenueTransactions(activeFilters),
            fetchRevenueSummary(activeFilters),
            fetchRevenueMonthly(activeFilters),
            fetchTopAccounts('revenue', activeFilters),
            fetchBreakdown('revenue', activeFilters),
          ]);
          if (cancelled) return;
          setTransactions(txns);
          setSummary(smry);
          setMonthlyData(monthly);
          setAccountPieData(accounts);
          setRegionData(breakdownRes.data);
          setBreakdownLabel(breakdownRes.label);
          setAllTransactionsCount(smry.total_transactions || 0);
        } else if (viewMode === 'pnl') {
          const [pnl, pnlMonth, accounts, breakdownRes] = await Promise.all([
            fetchPnlSummary(activeFilters),
            fetchPnlMonthly(activeFilters),
            fetchTopAccounts('expenses', activeFilters),
            fetchBreakdown('expenses', activeFilters),
          ]);
          if (cancelled) return;
          setPnlSummary(pnl);
          setMonthlyData(pnlMonth);
          setAccountPieData(accounts);
          setRegionData(breakdownRes.data);
          setBreakdownLabel(breakdownRes.label);
          setTransactions([]);
          setAllTransactionsCount(0);
        }
      } catch (err) {
        if (!cancelled) { console.error('Data load error:', err); setError(err.message); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [filters, viewMode]);

  // Reset filters when switching views
  const switchView = (mode) => {
    setViewMode(mode);
    clearFilters();
  };

  const activeFilterCount = Object.values(filters).filter((v) => !v.startsWith('All ')).length;

  const cascadeResetFilters = (prev, key) => {
    const next = { ...prev };
    if (key === 'operation') {
      next.division = 'All Divisions';
      next.region = 'All Regions';
      next.area = 'All Areas';
      next.branch = 'All Branches';
    } else if (key === 'division') {
      next.region = 'All Regions';
      next.area = 'All Areas';
      next.branch = 'All Branches';
    } else if (key === 'region') {
      next.area = 'All Areas';
      next.branch = 'All Branches';
    } else if (key === 'area') {
      next.branch = 'All Branches';
    }
    return next;
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      return cascadeResetFilters(next, key);
    });
  };
  const clearFilters = () => {
    setFilters({ accountTitle: 'All Account Titles', month: 'All Months', operation: 'All Operations', division: 'All Divisions', region: 'All Regions', area: 'All Areas', branch: 'All Branches' });
    setSearchTerm('');
  };
  const removeFilter = (key) => {
    const d = { accountTitle: 'All Account Titles', month: 'All Months', operation: 'All Operations', division: 'All Divisions', region: 'All Regions', area: 'All Areas', branch: 'All Branches' };
    setFilters((prev) => {
      const next = { ...prev, [key]: d[key] };
      return cascadeResetFilters(next, key);
    });
  };
  const getActiveFilters = () => Object.entries(filters).filter(([_, v]) => !v.startsWith('All ')).map(([key, value]) => ({ key, label: `${key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}: ${fixDisplayText(value)}` }));

  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return transactions;
    const term = searchTerm.toLowerCase();
    return transactions.filter(t =>
      (t.account_title && fixDisplayText(t.account_title).toLowerCase().includes(term)) ||
      (t.id && t.id.toLowerCase().includes(term)) ||
      (t.description && fixDisplayText(t.description).toLowerCase().includes(term)) ||
      (t.branch_name && fixDisplayText(t.branch_name).toLowerCase().includes(term)) ||
      (t.branch_code && t.branch_code.toLowerCase().includes(term))
    );
  }, [transactions, searchTerm]);

  const totals = useMemo(() => {
    let budget = 0;
    let transfer = 0;
    let sbar = 0;
    let actual = 0;

    filteredTransactions.forEach(t => {
      budget += parseFloat(t.budget) || 0;
      transfer += parseFloat(t.transfer_from_cfoo) || 0;
      sbar += parseFloat(t.sbar) || 0;
      actual += parseFloat(t.actual) || 0;
    });

    const adjustedBudget = budget + transfer + sbar;
    const remainingBudget = adjustedBudget - actual;
    const utilization = adjustedBudget > 0 ? (actual / adjustedBudget) * 100 : 0;

    return { budget, transfer, sbar, actual, adjustedBudget, remainingBudget, utilization };
  }, [filteredTransactions]);

  const exportCsv = () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = `${viewMode}-export-${timestamp}.csv`;
    let headers = [];
    let rows = [];

    if (viewMode === 'pnl') {
      headers = ['Month', 'Revenue', 'Expenses', 'Net Income'];
      rows = monthlyData.map((row) => [
        row.name,
        row.revenue ?? 0,
        row.expenses ?? 0,
        row.net ?? 0,
      ]);
    } else {
      headers = [
        'Account Title',
        'Branch Code',
        'Branch Name',
        'Budget',
        'Transfer CFOO',
        'SBAR',
        viewMode === 'expenses' ? 'Adjusted Budget' : 'Adjusted Target',
        viewMode === 'expenses' ? 'Actual Expenses' : 'Actual Revenue',
        viewMode === 'expenses' ? 'Remaining Budget' : 'Remaining Amount',
        viewMode === 'expenses' ? 'Utilization %' : 'Performance Rate %',
      ];
      rows = filteredTransactions.map((t) => {
        const budget = parseFloat(t.budget) || 0;
        const transfer = parseFloat(t.transfer_from_cfoo) || 0;
        const sbar = parseFloat(t.sbar) || 0;
        const actual = parseFloat(t.actual) || 0;
        const adjustedBudget = budget + transfer + sbar;
        const remainingBudget = adjustedBudget - actual;
        const utilization = adjustedBudget > 0 ? (actual / adjustedBudget) * 100 : 0;

        return [
          fixDisplayText(t.account_title),
          t.branch_code || '',
          fixDisplayText(t.branch_name || ''),
          budget,
          transfer,
          sbar,
          adjustedBudget,
          actual,
          remainingBudget,
          utilization.toFixed(1),
        ];
      });
    }

    const csv = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const defaultOptions = useMemo(() => ({
    accounts: ['All Account Titles'],
    months: ['All Months', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    operations: ['All Operations'],
    divisions: ['All Divisions'],
    regions: ['All Regions'],
    areas: ['All Areas'],
    branches: ['All Branches'],
  }), []);

  const options = filterOptions || defaultOptions;

  if (loading && !transactions.length) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 relative overflow-hidden">
        {/* Decorative background glow orbs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-400/10 dark:bg-blue-600/5 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-400/10 dark:bg-indigo-600/5 rounded-full blur-[100px] -z-10" />

        {/* Header Skeleton */}
        <header className="sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 lg:h-20 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="space-y-1">
                  <div className="w-32 h-5 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="w-20 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-28 h-9 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="w-9 h-9 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="w-24 h-9 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
          {/* Stat Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-white/5 rounded-2xl p-6 space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                </div>
                <div className="w-36 h-8 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="w-48 h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Filter Bar Skeleton */}
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-white/5 rounded-2xl p-4 lg:p-6 animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="w-full h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
            <div className="lg:col-span-1 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-white/5 rounded-2xl p-6 space-y-6">
              <div className="w-32 h-5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="w-40 h-40 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto animate-pulse" />
              <div className="space-y-2">
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            </div>
            <div className="lg:col-span-2 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-white/5 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div className="w-40 h-5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>
              <div className="h-44 w-full bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-white/5 rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="w-40 h-6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="w-28 h-5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className="w-full h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-full h-12 bg-slate-200/50 dark:bg-slate-800/30 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center transition-colors duration-300">
        <div className="text-center max-w-md glass p-8 rounded-3xl border border-red-200 dark:border-red-500/20">
          <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center border border-red-100 dark:border-red-500/20">
            <X size={36} className="text-red-500 dark:text-red-400" />
          </div>
          <p className="text-slate-900 dark:text-white font-semibold text-lg mb-2">Connection Error</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Could not connect to the database server. Make sure the API server is running.</p>
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-lg p-3 font-mono border border-red-100 dark:border-red-900/50">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-6 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center w-full gap-2">
            <RefreshCw size={16} /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 relative overflow-hidden selection:bg-blue-500/30 transition-colors duration-300">
      {/* Background Orbs for aesthetic */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[120px] -z-10 mix-blend-multiply dark:mix-blend-screen animate-pulse-glow" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-400/20 dark:bg-indigo-600/10 rounded-full blur-[100px] -z-10 mix-blend-multiply dark:mix-blend-screen" />

      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-200/50 dark:border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 animate-float">
                <img src="https://cams-cbs.asaphil.org/asa_philippines_logo_light.png" alt="ASA Philippines" className="h-10 lg:h-12 w-auto object-contain drop-shadow-sm" />
                <div>
                  <h1 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white tracking-tight">Budget Expenses</h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Operations Finance</p>
                </div>
              </div>
              <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-white/10" />
            </div>
            <div className="flex items-center gap-3">
              {/* Expenses / Revenue tab */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-900/60 rounded-xl p-1 border border-slate-200 dark:border-white/5 shadow-sm">
                <button
                  onClick={() => switchView('expenses')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    viewMode === 'expenses'
                      ? 'bg-blue-600 text-white shadow-md dark:shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <TrendingDown size={15} /> Expenses
                </button>
                <button
                  onClick={() => switchView('revenue')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    viewMode === 'revenue'
                      ? 'bg-emerald-600 text-white shadow-md dark:shadow-[0_0_10px_rgba(5,150,105,0.4)]'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <TrendingUp size={15} /> Revenue
                </button>
                <button
                  onClick={() => switchView('pnl')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    viewMode === 'pnl'
                      ? 'bg-indigo-600 text-white shadow-md dark:shadow-[0_0_10px_rgba(79,70,229,0.4)]'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <Scale size={15} /> P&L
                </button>
              </div>
              <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm dark:shadow-none" title="Toggle Theme">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={exportCsv} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md dark:shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                <Download size={16} />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
        {/* Summary Cards */}
        {viewMode === 'pnl' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            <StatCard icon={TrendingUp} label="Total Revenue" value={formatCurrency(pnlSummary.total_revenue || 0)} sublabel="Revenue actual collected" trend="up" trendLabel="Revenue" color="green" />
            <StatCard icon={TrendingDown} label="Total Expenses" value={formatCurrency(pnlSummary.total_expenses || 0)} sublabel="Expenses actual spent" trend="down" trendLabel="Expenses" color="red" />
            <StatCard icon={Scale} label="Net Income (P&L)" value={formatCurrency(pnlSummary.net_income || 0)} sublabel={(pnlSummary.net_income || 0) >= 0 ? 'Net Profit' : 'Net Loss'} trend={(pnlSummary.net_income || 0) >= 0 ? 'up' : 'down'} trendLabel={(pnlSummary.net_income || 0) >= 0 ? 'Profit' : 'Loss'} color="blue" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            <StatCard icon={Wallet} label="Total Budget" value={formatCurrency(summary.total_budget || 0)} sublabel="Total allocated budget for FY 2026" trend="up" trendLabel="100%" color="blue">
              <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-white/5 space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                  <span>Budget:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(summary.base_budget || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                  <span>Transfer from CFOO:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(summary.total_transfer_cfoo || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                  <span>SBAR:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(summary.total_sbar || 0)}</span>
                </div>
              </div>
            </StatCard>
            <StatCard 
              icon={viewMode === 'expenses' ? Activity : TrendingUp} 
              label={viewMode === 'expenses' ? "Actual Expenses" : "Actual Revenue"} 
              value={formatCurrency(summary.total_actual || 0)} 
              sublabel={viewMode === 'expenses' 
                ? `${((summary.total_actual / (summary.total_budget || 1)) * 100).toFixed(1)}% utilization`
                : `${((summary.total_actual / (summary.total_budget || 1)) * 100).toFixed(1)}% of target`
              } 
              trend={viewMode === 'expenses' 
                ? (summary.total_actual <= summary.total_budget ? 'up' : 'down')
                : (summary.total_actual >= summary.total_budget ? 'up' : 'down')
              } 
              trendLabel={`${((summary.total_actual / (summary.total_budget || 1)) * 100).toFixed(1)}%`} 
              color={viewMode === 'expenses' ? "red" : "green"} 
            />
            <StatCard 
              icon={TrendingDown} 
              label="Variance" 
              value={formatCurrency(Math.abs(summary.total_variance || 0))} 
              sublabel={viewMode === 'expenses'
                ? ((summary.total_variance || 0) >= 0 ? 'Under budget' : 'Over budget')
                : ((summary.total_variance || 0) <= 0 ? 'Above target' : 'Below target')
              } 
              trend={viewMode === 'expenses'
                ? ((summary.total_variance || 0) >= 0 ? 'up' : 'down')
                : ((summary.total_variance || 0) <= 0 ? 'up' : 'down')
              } 
              trendLabel={viewMode === 'expenses'
                ? ((summary.total_variance || 0) >= 0 ? 'Favorable' : 'Unfavorable')
                : ((summary.total_variance || 0) <= 0 ? 'Favorable' : 'Unfavorable')
              } 
              color={viewMode === 'expenses'
                ? 'yellow'
                : ((summary.total_variance || 0) <= 0 ? 'green' : 'yellow')
              } 
            />
          </div>
        )}

        {/* Filters */}
        <div className="glass p-5 lg:p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-blue-50 dark:bg-blue-500/10 p-2 rounded-lg border border-blue-100 dark:border-blue-500/20">
              <SlidersHorizontal size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-semibold text-slate-800 dark:text-white tracking-wide">Data Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-auto">
                <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 text-xs font-bold px-3 py-1 rounded-full">{activeFilterCount} active</span>
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {viewMode !== 'pnl' && (
              <>
                <FilterSelect label="Account Title" value={filters.accountTitle} onChange={(e) => updateFilter('accountTitle', e.target.value)} options={options.accounts || defaultOptions.accounts} />
                <FilterSelect label="Month" value={filters.month} onChange={(e) => updateFilter('month', e.target.value)} options={defaultOptions.months} />
              </>
            )}

            <FilterSelect label="Operation" value={filters.operation} onChange={(e) => updateFilter('operation', e.target.value)} options={options.operations || defaultOptions.operations} />
            <FilterSelect label="Division" value={filters.division} onChange={(e) => updateFilter('division', e.target.value)} options={options.divisions || defaultOptions.divisions} />
            <FilterSelect label="Region" value={filters.region} onChange={(e) => updateFilter('region', e.target.value)} options={options.regions || defaultOptions.regions} />
            <FilterSelect label="Area" value={filters.area} onChange={(e) => updateFilter('area', e.target.value)} options={options.areas || defaultOptions.areas} />
            <FilterSelect label="Branch" value={filters.branch} onChange={(e) => updateFilter('branch', e.target.value)} options={options.branches || defaultOptions.branches} />

            {viewMode !== 'pnl' && (
              <div className="relative xl:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Search Transactions</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input type="text" placeholder="Search by ID, Branch, or Details..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm dark:shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-600" />
                </div>
              </div>
            )}
            
            <div className="flex items-end gap-2 xl:col-span-1">
              <button onClick={() => setFilters({ ...filters })} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md dark:shadow-[0_0_10px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 border border-transparent dark:border-blue-500/50">
                <RefreshCw size={16} /> Apply
              </button>
              <button onClick={clearFilters} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-white/5">
                <X size={16} /> Clear
              </button>
            </div>
          </div>
          
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-200 dark:border-white/5">
              {getActiveFilters().map(({ key, label }) => (
                <span key={key} className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-colors">
                  {label}
                  <button onClick={() => removeFilter(key)} className="hover:text-slate-900 dark:hover:text-white transition-colors">
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 glass p-5 lg:p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{viewMode === 'pnl' ? 'Monthly P&L Breakdown' : 'Monthly Budget vs Actual'}</h3>
              <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${viewMode === 'pnl' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20' : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'}`}>{viewMode === 'pnl' ? 'Profit & Loss' : 'Trend Analysis'}</span>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                {viewMode === 'pnl' ? (
                  <BarChart data={monthlyData} barGap={6} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: theme === 'dark' ? '#cbd5e1' : '#64748b' }} axisLine={{ stroke: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: theme === 'dark' ? '#cbd5e1' : '#64748b' }} tickFormatter={(v) => `PHP ${(v / 1000000).toFixed(1)}M`} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }} />
                    <Legend wrapperStyle={{ fontSize: 13, paddingTop: 16, color: theme === 'dark' ? '#cbd5e1' : '#334155' }} iconType="circle" />
                    <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={35} />
                    <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={35} />
                    <Bar dataKey="net" name="Net Income" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={35} />
                  </BarChart>
                ) : (
                  <BarChart data={monthlyData} barGap={6} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: theme === 'dark' ? '#cbd5e1' : '#64748b' }} axisLine={{ stroke: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: theme === 'dark' ? '#cbd5e1' : '#64748b' }} tickFormatter={(v) => `PHP ${(v / 1000000).toFixed(1)}M`} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }} />
                    <Legend wrapperStyle={{ fontSize: 13, paddingTop: 16, color: theme === 'dark' ? '#cbd5e1' : '#334155' }} iconType="circle" />
                    <Bar dataKey="budget" name="Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="actual" name="Actual" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {viewMode === 'pnl' ? (
            <div className="lg:col-span-3 glass p-5 lg:p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">P&L Waterfall</h3>
                <span className="text-xs font-medium px-3 py-1.5 rounded-full border text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20">
                  Profit & Loss Breakdown
                </span>
              </div>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  {/* Waterfall chart would go here - for now showing placeholder */}
                  <div className="flex items-center justify-center h-full">
                    <span className="text-slate-500 dark:text-slate-400">Waterfall Chart Placeholder</span>
                  </div>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <>
              <div className="glass p-5 lg:p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Top Accounts</h3>
                  <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
                    viewMode === 'revenue'
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                      : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
                  }`}>
                    {viewMode === 'revenue' ? 'Revenue' : 'Spending'}
                  </span>
                </div>
                <div className="h-[320px] flex flex-col justify-between">
                  <div className="h-[238px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={accountPieData} cx="50%" cy="50%" outerRadius={85} dataKey="value" stroke="none" labelLine={false}
                          label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}>
                          {accountPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-1.5 pr-2 custom-scrollbar">
                    {accountPieData.slice(0, 4).map((a, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-slate-600 dark:text-slate-400 truncate" title={fixDisplayText(a.name)}>{fixDisplayText(a.name)}</span>
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono flex-shrink-0">{formatCurrency(a.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 glass p-5 lg:p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {viewMode === 'expenses' ? `${breakdownLabel} Spending` : `${breakdownLabel} Revenue`}
                  </h3>
                  <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${viewMode === 'expenses' ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'}`}>
                    Top {breakdownLabel}s
                  </span>
                </div>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regionData} layout="vertical" barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => `PHP ${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={110} tickFormatter={fixDisplayText} tick={{ fontSize: 11, fill: theme === 'dark' ? '#cbd5e1' : '#475569' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }} />
                      <Bar dataKey="amount" name={viewMode === 'expenses' ? "Actual Expenses" : "Actual Revenue"} fill={viewMode === 'expenses' ? "#ef4444" : "#10b981"} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Transactions Table */}
        {viewMode !== 'pnl' && (
          <div className="glass overflow-hidden rounded-2xl">
            <div className="p-5 lg:p-6 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center justify-end">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
                  Showing {Math.min(filteredTransactions.length, 100)} of {filteredTransactions.length.toLocaleString()}
                </span>
              </div>
            </div>
            
            {loading && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw size={24} className="text-blue-500 animate-spin mr-3" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Fetching data...</span>
              </div>
            )}
            
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto relative isolate">
              <table style={{ borderSpacing: 0 }} className="w-full text-left border-separate table-fixed min-w-[1660px]">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                  <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-white/5">
                    <th style={{ width: '280px', minWidth: '280px', maxWidth: '280px', left: 0, position: 'sticky' }} className="z-40 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-2.5 whitespace-nowrap bg-slate-100 dark:bg-slate-900 border-r border-slate-300 dark:border-white/10 shadow-[10px_0_18px_-10px_rgba(15,23,42,0.55)] bg-clip-padding">Account Title</th>
                    {filters.branch !== 'All Branches' && (
                      <th style={{ width: '240px' }} className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-2.5 whitespace-nowrap">Branch</th>
                    )}
                    <th style={{ width: '150px' }} className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-2.5 whitespace-nowrap">Budget</th>
                    <th style={{ width: '190px' }} className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-2.5 whitespace-nowrap">Transfer CFOO</th>
                    <th style={{ width: '140px' }} className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-2.5 whitespace-nowrap">SBAR</th>
                    <th style={{ width: '170px' }} className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-2.5 whitespace-nowrap">{viewMode === 'expenses' ? 'Adjusted Budget' : 'Adjusted Target'}</th>
                    <th style={{ width: '160px' }} className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-2.5 whitespace-nowrap">{viewMode === 'expenses' ? 'Actual' : 'Actual Revenue'}</th>
                    <th style={{ width: '175px' }} className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-2.5 whitespace-nowrap">{viewMode === 'expenses' ? 'Remaining Budget' : 'Remaining Amount'}</th>
                    <th style={{ width: '155px' }} className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-2.5 whitespace-nowrap">{viewMode === 'expenses' ? '% Utilization' : 'Performance Rate'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredTransactions.slice(0, 100).map((t, idx) => {
                    const tBudget = parseFloat(t.budget) || 0;
                    const tTransfer = parseFloat(t.transfer_from_cfoo) || 0;
                    const tSbar = parseFloat(t.sbar) || 0;
                    const tActual = parseFloat(t.actual) || 0;
                    const tAdjusted = tBudget + tTransfer + tSbar;
                    const tRemaining = tAdjusted - tActual;
                    const tUtilization = tAdjusted > 0 ? (tActual / tAdjusted) * 100 : 0;

                    return (
                      <tr
                        key={idx}
                        className={`group transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-800/40 ${
                          idx % 2 === 0
                            ? 'bg-slate-50/60 dark:bg-slate-900/20'
                            : 'bg-white dark:bg-slate-950/20'
                        }`}
                      >
                        <td style={{ width: '280px', minWidth: '280px', maxWidth: '280px', left: 0, position: 'sticky' }} className={`z-30 px-5 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-normal break-words border-r border-slate-300 dark:border-white/10 shadow-[10px_0_18px_-10px_rgba(15,23,42,0.5)] bg-clip-padding ${
                          idx % 2 === 0
                            ? 'bg-slate-50 dark:bg-[#131b2e]'
                            : 'bg-white dark:bg-[#0d1424]'
                        } group-hover:bg-slate-100 dark:group-hover:bg-[#1e293b] transition-colors duration-150`}>
                          {fixDisplayText(t.account_title)}
                        </td>
                        {filters.branch !== 'All Branches' && (
                          <td className="px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{t.branch_code} _ {fixDisplayText(t.branch_name)}</td>
                        )}
                        <td className="px-5 py-2 text-sm font-mono text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatCurrency(tBudget)}</td>
                        <td className="px-5 py-2 text-sm font-mono text-right text-amber-600 dark:text-amber-400/90 whitespace-nowrap">{formatCurrency(tTransfer)}</td>
                        <td className="px-5 py-2 text-sm font-mono text-right text-indigo-600 dark:text-indigo-400/90 whitespace-nowrap">{formatCurrency(tSbar)}</td>
                        <td className="px-5 py-2 text-sm font-mono font-medium text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatCurrency(tAdjusted)}</td>
                        <td className="px-5 py-2 text-sm font-mono font-medium text-right text-slate-900 dark:text-white whitespace-nowrap">{formatCurrency(tActual)}</td>
                        <td className={`px-5 py-2 text-sm font-mono font-semibold text-right whitespace-nowrap ${tRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(tRemaining)}
                        </td>
                        <td className="px-5 py-2 text-sm font-mono font-medium text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {tUtilization.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {filteredTransactions.length > 0 && (
                  <tfoot className="sticky bottom-0 z-10 bg-red-50 dark:bg-[#1a0f0f] border-t-2 border-red-200 dark:border-red-500/20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                    <tr className="bg-red-50 dark:bg-[#1a0f0f] font-semibold text-red-600 dark:text-red-400">
                      <td style={{ width: '280px', minWidth: '280px', maxWidth: '280px', left: 0, position: 'sticky' }} className="z-40 px-5 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 whitespace-normal break-words bg-red-50 dark:bg-[#1a0f0f] border-r border-red-300 dark:border-red-500/30 shadow-[10px_0_18px_-10px_rgba(15,23,42,0.55)] bg-clip-padding">Total</td>
                      {filters.branch !== 'All Branches' && (
                        <td className="px-5 py-2.5 text-sm"></td>
                      )}
                      <td className="px-5 py-2.5 text-sm font-mono font-bold text-right text-red-600 dark:text-red-400 whitespace-nowrap">{formatCurrency(totals.budget)}</td>
                      <td className="px-5 py-2.5 text-sm font-mono font-bold text-right text-red-600 dark:text-red-400 whitespace-nowrap">{formatCurrency(totals.transfer)}</td>
                      <td className="px-5 py-2.5 text-sm font-mono font-bold text-right text-red-600 dark:text-red-400 whitespace-nowrap">{formatCurrency(totals.sbar)}</td>
                      <td className="px-5 py-2.5 text-sm font-mono font-bold text-right text-red-600 dark:text-red-400 whitespace-nowrap">{formatCurrency(totals.adjustedBudget)}</td>
                      <td className="px-5 py-2.5 text-sm font-mono font-bold text-right text-red-600 dark:text-red-400 whitespace-nowrap">{formatCurrency(totals.actual)}</td>
                      <td className="px-5 py-2.5 text-sm font-mono font-bold text-right text-red-600 dark:text-red-400 whitespace-nowrap">{formatCurrency(totals.remainingBudget)}</td>
                      <td className="px-5 py-2.5 text-sm font-mono font-bold text-right text-red-600 dark:text-red-400 whitespace-nowrap">{totals.utilization.toFixed(1)}%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
              
              {filteredTransactions.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 px-4">
                  <div className="bg-slate-100 dark:bg-slate-800/50 p-5 rounded-full mb-4 border border-slate-200 dark:border-white/5">
                    <Search size={36} className="text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-slate-800 dark:text-slate-300 font-medium text-lg">No transactions found</p>
                  <p className="text-slate-500 text-sm mt-1 mb-6">Try adjusting your filters or search terms</p>
                  <button onClick={clearFilters} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md dark:shadow-[0_0_15px_rgba(37,99,235,0.3)] border border-transparent dark:border-blue-500/50">
                    <RefreshCw size={16} className="inline mr-2" /> Reset All Filters
                  </button>
                </div>
              )}
              
              {filteredTransactions.length > 100 && (
                <div className="text-center py-4 text-sm font-medium text-slate-500 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-white/5">
                  Showing top 100 of {filteredTransactions.length} results
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-white/5 mt-12 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 font-medium">Budget Expenses Dashboard &copy; 2026 &middot; ASA Philippines</p>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-600">
              <span className="hover:text-slate-800 dark:hover:text-slate-400 cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-slate-800 dark:hover:text-slate-400 cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-slate-800 dark:hover:text-slate-400 cursor-pointer transition-colors">Support</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Scroll Controls */}
      {showScrollTop && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-2.5 z-50">
          <button
            onClick={scrollToTop}
            className="p-3.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
            title="Scroll to Top"
          >
            <ArrowUp size={20} />
          </button>
          <button
            onClick={scrollToBottom}
            className="p-3.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
            title="Scroll to Bottom"
          >
            <ArrowDown size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
