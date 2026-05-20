const configuredApiBase = import.meta.env.VITE_API_BASE || '';
const isStaticHost = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
const API_BASE = configuredApiBase || (isStaticHost ? '' : 'http://localhost:3001');
const USE_STATIC_DATA = !configuredApiBase && isStaticHost;

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const EXPENSE_ACCOUNTS = [
  'Personnel Costs',
  'Trainings, Seminars, and Conference',
  'SBF',
  'Transportation and other travel expense',
  'Supplies',
  'Rent',
  'Interest Expense on Lease Obligations',
  'Utilities',
  'Communication and Postage',
  'Meetings',
  'Publication, Printing, Subscription and Membership Dues',
  'Taxes and Licenses',
  'Repairs and Maintenance',
  'Insurance Expense',
  'Information Technology Expenses',
  'General Support Services',
  'Representation',
  'Depreciation and Amortization',
  'Miscellaneous',
  'Client and Community Services',
  'Rebates Special',
  'Bank Charges/Others',
  'Consultancy and Professional Fees',
  'Impairment Losses',
  'Income Tax Expense',
  'Research and Development',
];

const REVENUE_ACCOUNTS = [
  'Interest on Loans',
  'Rebates on Financing',
  'Service Fees',
  'Fines, Penalties & Surcharges',
  'Commission on Insurance',
  'Interest from Deposits',
  'Donations and Grants',
  'Earnings from Investments',
  'Rent Income',
  'Recovery from Written Off Accounts',
  'Membership Contribution',
  'Passbook Fee',
  'Others',
];

const SPECIAL_EXPENSE_ACCOUNTS = new Set([
  'Client and Community Services',
  'Personnel Costs',
  'Trainings, Seminars, and Conference',
]);

let staticDataPromise = null;

function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'All' && !value.startsWith('All ')) {
      params.set(key, value);
    }
  });
  return params.toString() ? `?${params.toString()}` : '';
}

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

async function loadStaticData() {
  if (!staticDataPromise) {
    staticDataPromise = fetch(`${import.meta.env.BASE_URL}data/static-data.json`).then((res) => {
      if (!res.ok) throw new Error('Static dashboard data is missing. Run npm run generate:static-data.');
      return res.json();
    }).then((data) => {
      const branches = data.branches.map((row) => ({
        branch_code: row[0],
        branch_name: row[1],
        area: row[2],
        region: row[3],
        division: row[4],
        operation: row[5],
      }));
      const actual = data.actual.map((row) => ({
        branch_code: row[0],
        month: row[1],
        account_title: row[2],
        actual: row[3],
      }));
      const budget = data.budget.map((row) => ({
        branch_code: row[0],
        month: row[1],
        account_title: row[2],
        budget: row[3],
        transfer_from_cfoo: row[4],
        sbar: row[5],
      }));
      const revenueActual = data.revenueActual.map((row) => ({
        branch_code: row[0],
        month: row[1],
        account_title: row[2],
        actual: row[3],
      }));
      const revenueBudget = data.revenueBudget.map((row) => ({
        branch_code: row[0],
        month: row[1],
        account_title: row[2],
        budget: row[3],
        transfer_from_cfoo: row[4],
        sbar: row[5],
      }));
      const branchesByCode = new Map(branches.map((branch) => [branch.branch_code, branch]));
      return { branches, actual, budget, revenueActual, revenueBudget, branchesByCode };
    });
  }
  return staticDataPromise;
}

function branchDisplay(branch) {
  return `${branch.branch_code} _ ${branch.branch_name}`;
}

function selected(value) {
  return value && !String(value).startsWith('All ');
}

function matchesBranch(branch, filters = {}) {
  if (!branch) return false;
  if (selected(filters.operation) && branch.operation !== filters.operation) return false;
  if (selected(filters.division) && branch.division !== filters.division) return false;
  if (selected(filters.region) && branch.region !== filters.region) return false;
  if (selected(filters.area) && branch.area !== filters.area) return false;
  if (selected(filters.branch) && branchDisplay(branch) !== filters.branch) return false;
  return true;
}

function matchesRow(row, branch, filters = {}) {
  if (!matchesBranch(branch, filters)) return false;
  if (selected(filters.accountTitle) && row.account_title !== filters.accountTitle) return false;
  if (selected(filters.month) && row.month !== monthNames.indexOf(filters.month) + 1) return false;
  return true;
}

function sortCustom(rows, order, key = 'account_title') {
  const orderMap = new Map(order.map((value, index) => [value, index]));
  return rows.sort((a, b) => (orderMap.get(a[key]) ?? 999) - (orderMap.get(b[key]) ?? 999));
}

function addMoney(target, source) {
  target.actual += source.actual || 0;
  target.budget += source.budget || 0;
  target.transfer_from_cfoo += source.transfer_from_cfoo || 0;
  target.sbar += source.sbar || 0;
}

async function staticTransactions(view, filters = {}) {
  const data = await loadStaticData();
  const actualRows = view === 'revenue' ? data.revenueActual : data.actual;
  const budgetRows = view === 'revenue' ? data.revenueBudget : data.budget;
  const order = view === 'revenue' ? REVENUE_ACCOUNTS : EXPENSE_ACCOUNTS;
  const hasBranch = selected(filters.branch);
  const map = new Map();

  const ensure = (row, branch) => {
    const key = hasBranch ? `${row.branch_code}::${row.account_title}` : row.account_title;
    if (!map.has(key)) {
      map.set(key, {
        branch_code: hasBranch ? row.branch_code : undefined,
        branch_name: hasBranch ? branch.branch_name : undefined,
        area: hasBranch ? branch.area : undefined,
        region: hasBranch ? branch.region : undefined,
        account_title: row.account_title,
        account_code: row.account_code || '',
        actual: 0,
        budget: 0,
        transfer_from_cfoo: 0,
        sbar: 0,
      });
    }
    return map.get(key);
  };

  for (const row of actualRows) {
    const branch = data.branchesByCode.get(row.branch_code);
    if (matchesRow(row, branch, filters)) addMoney(ensure(row, branch), row);
  }

  for (const row of budgetRows) {
    const branch = data.branchesByCode.get(row.branch_code);
    if (matchesRow(row, branch, filters)) addMoney(ensure(row, branch), row);
  }

  const rows = Array.from(map.values()).map((row) => {
    if (view === 'expenses' && SPECIAL_EXPENSE_ACCOUNTS.has(row.account_title)) {
      row.transfer_from_cfoo = row.actual;
    }
    row.variance = row.budget + row.transfer_from_cfoo + row.sbar - row.actual;
    return row;
  });

  return sortCustom(rows, order);
}

async function staticSummary(view, filters = {}) {
  const data = await loadStaticData();
  const rows = await staticTransactions(view, filters);
  const actualRows = view === 'revenue' ? data.revenueActual : data.actual;
  const total_actual = rows.reduce((sum, row) => sum + row.actual, 0);
  const base_budget = rows.reduce((sum, row) => sum + row.budget, 0);
  const total_transfer_cfoo = rows.reduce((sum, row) => sum + row.transfer_from_cfoo, 0);
  const total_sbar = rows.reduce((sum, row) => sum + row.sbar, 0);
  const total_budget = base_budget + total_transfer_cfoo + total_sbar;
  const total_transactions = actualRows.filter((row) => matchesRow(row, data.branchesByCode.get(row.branch_code), filters)).length;

  return {
    total_budget,
    base_budget,
    total_actual,
    total_variance: total_budget - total_actual,
    total_transactions,
    total_transfer_cfoo,
    total_sbar,
  };
}

async function staticMonthly(view, filters = {}) {
  const months = selected(filters.month) ? [monthNames.indexOf(filters.month) + 1] : monthNames.map((_, index) => index + 1);
  const result = [];

  for (const month of months) {
    const summary = await staticSummary(view, { ...filters, month: monthNames[month - 1] });
    if (summary.total_budget || summary.total_actual) {
      result.push({
        name: monthNames[month - 1].slice(0, 3),
        budget: summary.total_budget,
        actual: summary.total_actual,
      });
    }
  }

  return result;
}

async function staticFilterOptions(filters = {}, view = 'expenses') {
  const data = await loadStaticData();
  const base = data.branches.filter((branch) => {
    if (selected(filters.operation) && branch.operation !== filters.operation) return false;
    if (selected(filters.division) && branch.division !== filters.division) return false;
    if (selected(filters.region) && branch.region !== filters.region) return false;
    if (selected(filters.area) && branch.area !== filters.area) return false;
    return true;
  });
  const unique = (key) => [...new Set(base.map((branch) => branch[key]).filter(Boolean))].sort();

  return {
    branches: ['All Branches', ...base.map(branchDisplay).sort()],
    operations: ['All Operations', ...unique('operation')],
    divisions: ['All Divisions', ...unique('division')],
    regions: ['All Regions', ...unique('region')],
    areas: ['All Areas', ...unique('area')],
    accounts: ['All Account Titles', ...(view === 'revenue' ? REVENUE_ACCOUNTS : EXPENSE_ACCOUNTS)],
    months: ['All Months', ...monthNames],
  };
}

async function staticTopAccounts(view = 'expenses', filters = {}) {
  const rows = await staticTransactions(view, filters);
  return rows
    .map((row) => ({ name: row.account_title, value: row.actual }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 6);
}

async function staticBreakdown(view, filters = {}) {
  const data = await loadStaticData();
  const rows = view === 'revenue' ? data.revenueActual : data.actual;
  const label = !selected(filters.operation) ? 'Operation'
    : !selected(filters.division) ? 'Division'
      : !selected(filters.region) ? 'Region'
        : !selected(filters.area) ? 'Area'
          : 'Branch';
  const keyMap = { Operation: 'operation', Division: 'division', Region: 'region', Area: 'area' };
  const grouped = new Map();

  for (const row of rows) {
    const branch = data.branchesByCode.get(row.branch_code);
    if (!matchesRow(row, branch, filters)) continue;
    const name = label === 'Branch' ? branchDisplay(branch) : branch[keyMap[label]];
    grouped.set(name, (grouped.get(name) || 0) + row.actual);
  }

  return {
    label,
    data: Array.from(grouped, ([name, amount]) => ({ name, amount }))
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 8),
  };
}

async function staticPnlSummary(filters = {}) {
  const [revenue, expenses] = await Promise.all([
    staticSummary('revenue', filters),
    staticSummary('expenses', filters),
  ]);
  return {
    total_revenue: revenue.total_actual,
    total_expenses: expenses.total_actual,
    net_income: revenue.total_actual - expenses.total_actual,
  };
}

async function staticPnlMonthly(filters = {}) {
  const [revenue, expenses] = await Promise.all([
    staticMonthly('revenue', filters),
    staticMonthly('expenses', filters),
  ]);
  const map = new Map();
  for (const row of revenue) map.set(row.name, { name: row.name, revenue: row.actual, expenses: 0, net: row.actual });
  for (const row of expenses) {
    const item = map.get(row.name) || { name: row.name, revenue: 0, expenses: 0, net: 0 };
    item.expenses = row.actual;
    item.net = item.revenue - item.expenses;
    map.set(row.name, item);
  }
  return monthNames.map((name) => name.slice(0, 3)).filter((name) => map.has(name)).map((name) => map.get(name));
}

export async function fetchTransactions(filters = {}) {
  if (USE_STATIC_DATA) return staticTransactions('expenses', filters);
  return fetchJson(`/api/transactions${buildQuery(filters)}`);
}

export async function fetchSummary(filters = {}) {
  if (USE_STATIC_DATA) return staticSummary('expenses', filters);
  return fetchJson(`/api/summary${buildQuery(filters)}`);
}

export async function fetchMonthlyData(filters = {}) {
  if (USE_STATIC_DATA) return staticMonthly('expenses', filters);
  return fetchJson(`/api/monthly${buildQuery(filters)}`);
}

export async function fetchFilterOptions(filters = {}) {
  if (USE_STATIC_DATA) return staticFilterOptions(filters, 'expenses');
  return fetchJson(`/api/filter-options${buildQuery(filters)}`);
}

export async function fetchStatusBreakdown() {
  if (USE_STATIC_DATA) return [];
  return fetchJson('/api/status-breakdown');
}

export async function fetchTopAccounts(view = 'expenses', filters = {}) {
  if (USE_STATIC_DATA) return staticTopAccounts(view, filters);
  const query = buildQuery(filters);
  const prefix = query ? `${query}&view=${view}` : `?view=${view}`;
  return fetchJson(`/api/top-accounts${prefix}`);
}

export async function fetchBreakdown(view, filters = {}) {
  if (USE_STATIC_DATA) return staticBreakdown(view, filters);
  const query = buildQuery(filters);
  const prefix = query ? `${query}&view=${view}` : `?view=${view}`;
  return fetchJson(`/api/breakdown${prefix}`);
}

export async function fetchRevenueTransactions(filters = {}) {
  if (USE_STATIC_DATA) return staticTransactions('revenue', filters);
  return fetchJson(`/api/revenue/transactions${buildQuery(filters)}`);
}

export async function fetchRevenueSummary(filters = {}) {
  if (USE_STATIC_DATA) return staticSummary('revenue', filters);
  return fetchJson(`/api/revenue/summary${buildQuery(filters)}`);
}

export async function fetchRevenueMonthly(filters = {}) {
  if (USE_STATIC_DATA) return staticMonthly('revenue', filters);
  return fetchJson(`/api/revenue/monthly${buildQuery(filters)}`);
}

export async function fetchRevenueFilterOptions(filters = {}) {
  if (USE_STATIC_DATA) return staticFilterOptions(filters, 'revenue');
  return fetchJson(`/api/revenue/filter-options${buildQuery(filters)}`);
}

export async function fetchPnlSummary(filters = {}) {
  if (USE_STATIC_DATA) return staticPnlSummary(filters);
  return fetchJson(`/api/pnl/summary${buildQuery(filters)}`);
}

export async function fetchPnlMonthly(filters = {}) {
  if (USE_STATIC_DATA) return staticPnlMonthly(filters);
  return fetchJson(`/api/pnl/monthly${buildQuery(filters)}`);
}

export async function fetchDbStatus() {
  if (USE_STATIC_DATA) {
    const data = await loadStaticData();
    return { branches: data.branches.length, actuals: data.actual.length, budgets: data.budget.length };
  }
  return fetchJson('/api/db-status');
}
