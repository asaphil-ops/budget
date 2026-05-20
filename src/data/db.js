// Database service for Neon Tech PostgreSQL
// Connects the React frontend to your live database

import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;

const sql = neon(connectionString);

export async function fetchTransactions(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.accountTitle && filters.accountTitle !== 'All Account Titles') {
    conditions.push(`a.account_title = $${params.length + 1}`);
    params.push(filters.accountTitle);
  }
  if (filters.month && filters.month !== 'All Months') {
    const monthIndex = ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(filters.month) + 1;
    conditions.push(`a.month = $${params.length + 1}`);
    params.push(monthIndex);
  }
  if (filters.operation && filters.operation !== 'All Operations') {
    conditions.push(`b.operation = $${params.length + 1}`);
    params.push(filters.operation);
  }
  if (filters.division && filters.division !== 'All Divisions') {
    conditions.push(`b.division = $${params.length + 1}`);
    params.push(filters.division);
  }
  if (filters.region && filters.region !== 'All Regions') {
    conditions.push(`b.region = $${params.length + 1}`);
    params.push(filters.region);
  }
  if (filters.area && filters.area !== 'All Areas') {
    conditions.push(`b.area = $${params.length + 1}`);
    params.push(filters.area);
  }
  if (filters.branch && filters.branch !== 'All Branches') {
    conditions.push(`b.branch_name = $${params.length + 1}`);
    params.push(filters.branch);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      CONCAT('BE-', LPAD(ROW_NUMBER() OVER (ORDER BY a.date DESC)::TEXT, 5, '0')) AS id,
      b.branch_code,
      b.branch_name,
      b.area,
      b.region,
      b.division,
      b.operation,
      a.account_title,
      a.account_code,
      a.month,
      a.actual,
      COALESCE(bg.budget, 0) AS budget,
      COALESCE(bg.transfer_from_cfoo, 0) AS transfer_from_cfoo,
      COALESCE(bg.sbar, 0) AS sbar,
      COALESCE(bg.budget, 0) - COALESCE(a.actual, 0) AS variance,
      a.status,
      a.date,
      a.description
    FROM branch b
    JOIN actual a ON b.branch_code = a.branch_code
    LEFT JOIN budget bg ON b.branch_code = bg.branch_code AND a.month = bg.month AND a.account_title = bg.account_title
    ${whereClause}
    ORDER BY a.date DESC
    LIMIT 50
  `;

  const result = await sql(query, params);
  return result;
}

export async function fetchSummary(filters = {}) {
  const result = await fetchTransactions(filters);
  
  const totalBudget = result.reduce((s, t) => s + parseFloat(t.budget || 0), 0);
  const totalActual = result.reduce((s, t) => s + parseFloat(t.actual || 0), 0);
  const totalVariance = result.reduce((s, t) => s + parseFloat(t.variance || 0), 0);
  
  return {
    totalBudget,
    totalActual,
    totalVariance,
    totalTransactions: result.length,
  };
}

export async function fetchMonthlyData(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.division && filters.division !== 'All Divisions') {
    conditions.push(`b.division = $${params.length + 1}`);
    params.push(filters.division);
  }
  if (filters.region && filters.region !== 'All Regions') {
    conditions.push(`b.region = $${params.length + 1}`);
    params.push(filters.region);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      a.month,
      SUM(COALESCE(bg.budget, 0)) AS budget,
      SUM(COALESCE(a.actual, 0)) AS actual
    FROM branch b
    JOIN actual a ON b.branch_code = a.branch_code
    LEFT JOIN budget bg ON b.branch_code = bg.branch_code AND a.month = bg.month AND a.account_title = bg.account_title
    ${whereClause}
    GROUP BY a.month
    ORDER BY a.month
  `;

  return await sql(query, params);
}

export async function fetchFilterOptions() {
  const branches = await sql`SELECT DISTINCT branch_name FROM branch ORDER BY branch_name`;
  const operations = await sql`SELECT DISTINCT operation FROM branch ORDER BY operation`;
  const divisions = await sql`SELECT DISTINCT division FROM branch ORDER BY division`;
  const regions = await sql`SELECT DISTINCT region FROM branch ORDER BY region`;
  const areas = await sql`SELECT DISTINCT area FROM branch ORDER BY area`;
  const accounts = await sql`SELECT DISTINCT account_title FROM actual ORDER BY account_title`;

  return {
    branches: branches.map(r => r.branch_name),
    operations: operations.map(r => r.operation),
    divisions: divisions.map(r => r.division),
    regions: regions.map(r => r.region),
    areas: areas.map(r => r.area),
    accounts: accounts.map(r => r.account_title),
  };
}

export default sql;
