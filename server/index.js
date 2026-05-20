// API Server for Budget Expenses Dashboard
// Connects to Neon database and provides REST endpoints for the React frontend
// Run: node server/index.js

import { neon } from '@neondatabase/serverless';
import http from 'http';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required.');
}

const sql = neon(DATABASE_URL);

const PORT = 3001;

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
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
  'Research and Development'
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
  'Others'
];

// CORS headers for local development
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8'
};

async function execQuery(queryString) {
  const unsafeQuery = sql.unsafe(queryString);
  return await sql`${unsafeQuery}`;
}

// Build filter conditions for expenses tables (actual / budget)
function buildFilters(url, prefix = 'a') {
  const urlObj = new URL(url, `http://localhost:${PORT}`);
  const conditions = [];

  const accountTitle = urlObj.searchParams.get('accountTitle');
  const month       = urlObj.searchParams.get('month');
  const operation   = urlObj.searchParams.get('operation');
  const division    = urlObj.searchParams.get('division');
  const region      = urlObj.searchParams.get('region');
  const area        = urlObj.searchParams.get('area');
  const branch      = urlObj.searchParams.get('branch');

  if (accountTitle && accountTitle !== 'All Account Titles')
    conditions.push(`${prefix}.account_title = ${lit(accountTitle)}`);
  if (month && month !== 'All Months') {
    const idx = monthNames.indexOf(month) + 1;
    conditions.push(`${prefix}.month = ${idx}`);
  }
  if (operation && operation !== 'All Operations')
    conditions.push(`b.operation = ${lit(operation)}`);
  if (division && division !== 'All Divisions')
    conditions.push(`b.division = ${lit(division)}`);
  if (region && region !== 'All Regions')
    conditions.push(`b.region = ${lit(region)}`);
  if (area && area !== 'All Areas')
    conditions.push(`b.area = ${lit(area)}`);
  if (branch && branch !== 'All Branches')
    conditions.push(`CONCAT(b.branch_code, ' _ ', b.branch_name) = ${lit(branch)}`);

  return conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
}

// Build filter conditions for revenue tables (revenue_budget / revenue_actual)
function buildRevenueFilters(url, prefix = 'ra') {
  const urlObj = new URL(url, `http://localhost:${PORT}`);
  const conditions = [];

  const accountTitle = urlObj.searchParams.get('accountTitle');
  const month       = urlObj.searchParams.get('month');
  const operation   = urlObj.searchParams.get('operation');
  const division    = urlObj.searchParams.get('division');
  const region      = urlObj.searchParams.get('region');
  const area        = urlObj.searchParams.get('area');
  const branch      = urlObj.searchParams.get('branch');

  if (accountTitle && accountTitle !== 'All Account Titles')
    conditions.push(`${prefix}.account_title = ${lit(accountTitle)}`);
  if (month && month !== 'All Months') {
    const idx = monthNames.indexOf(month) + 1;
    conditions.push(`${prefix}.month = ${idx}`);
  }
  if (operation && operation !== 'All Operations')
    conditions.push(`b.operation = ${lit(operation)}`);
  if (division && division !== 'All Divisions')
    conditions.push(`b.division = ${lit(division)}`);
  if (region && region !== 'All Regions')
    conditions.push(`b.region = ${lit(region)}`);
  if (area && area !== 'All Areas')
    conditions.push(`b.area = ${lit(area)}`);
  if (branch && branch !== 'All Branches')
    conditions.push(`CONCAT(b.branch_code, ' _ ', b.branch_name) = ${lit(branch)}`);

  return conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
}

function lit(str) {
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function sortCustom(arr, orderArray, key = 'account_title') {
  const orderMap = {};
  orderArray.forEach((title, idx) => {
    orderMap[title] = idx;
  });
  return arr.sort((a, b) => {
    const valA = a[key];
    const valB = b[key];
    const idxA = orderMap[valA] !== undefined ? orderMap[valA] : 999;
    const idxB = orderMap[valB] !== undefined ? orderMap[valB] : 999;
    return idxA - idxB;
  });
}

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const url  = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    // ── EXPENSES: TRANSACTIONS ────────────────────────────────────────
    if (path === '/api/transactions') {
      const urlObj   = new URL(req.url, `http://localhost:${PORT}`);
      const hasBranch = urlObj.searchParams.get('branch') && urlObj.searchParams.get('branch') !== 'All Branches';
      const aWhere = buildFilters(req.url, 'a');
      const bgWhere = buildFilters(req.url, 'bg');

      if (hasBranch) {
        const [aRows, bgRows] = await Promise.all([
          execQuery(`
            SELECT
              b.branch_code, b.branch_name, b.area, b.region,
              a.account_title, a.account_code,
              SUM(a.actual) AS actual
            FROM branch b
            JOIN actual a ON b.branch_code = a.branch_code
            ${aWhere}
            GROUP BY b.branch_code, b.branch_name, b.area, b.region, a.account_title, a.account_code
          `),
          execQuery(`
            SELECT
              b.branch_code, b.branch_name, b.area, b.region,
              bg.account_title,
              SUM(bg.budget) AS budget,
              SUM(bg.transfer_from_cfoo) AS transfer_from_cfoo,
              SUM(bg.sbar) AS sbar
            FROM branch b
            JOIN budget bg ON b.branch_code = bg.branch_code
            ${bgWhere}
            GROUP BY b.branch_code, b.branch_name, b.area, b.region, bg.account_title
          `)
        ]);

        const codeMap = {};
        for (const r of aRows) {
          if (r.account_code) codeMap[r.account_title] = r.account_code;
        }

        const map = {};
        for (const aRow of aRows) {
          const k = `${aRow.branch_code}::${aRow.account_title}`;
          map[k] = {
            branch_code: aRow.branch_code,
            branch_name: aRow.branch_name,
            area: aRow.area,
            region: aRow.region,
            account_title: aRow.account_title,
            account_code: aRow.account_code,
            actual: parseFloat(aRow.actual || 0),
            budget: 0,
            transfer_from_cfoo: 0,
            sbar: 0
          };
        }
        for (const bgRow of bgRows) {
          const k = `${bgRow.branch_code}::${bgRow.account_title}`;
          if (!map[k]) {
            map[k] = {
              branch_code: bgRow.branch_code,
              branch_name: bgRow.branch_name,
              area: bgRow.area,
              region: bgRow.region,
              account_title: bgRow.account_title,
              account_code: codeMap[bgRow.account_title] || '',
              actual: 0,
              budget: parseFloat(bgRow.budget || 0),
              transfer_from_cfoo: parseFloat(bgRow.transfer_from_cfoo || 0),
              sbar: parseFloat(bgRow.sbar || 0)
            };
          } else {
            map[k].budget = parseFloat(bgRow.budget || 0);
            map[k].transfer_from_cfoo = parseFloat(bgRow.transfer_from_cfoo || 0);
            map[k].sbar = parseFloat(bgRow.sbar || 0);
          }
        }

        const specialAccounts = ['Client and Community Services', 'Personnel Costs', 'Trainings, Seminars, and Conference'];
        const mergedRows = Object.values(map).map(row => {
          if (specialAccounts.includes(row.account_title)) {
            row.transfer_from_cfoo = row.actual;
          }
          row.variance = (row.budget + row.transfer_from_cfoo + row.sbar) - row.actual;
          return row;
        });

        res.writeHead(200, CORS_HEADERS);
        res.end(JSON.stringify(sortCustom(mergedRows, EXPENSE_ACCOUNTS)));
      } else {
        const [aRows, bgRows] = await Promise.all([
          execQuery(`
            SELECT
              a.account_title, a.account_code,
              SUM(a.actual) AS actual
            FROM branch b
            JOIN actual a ON b.branch_code = a.branch_code
            ${aWhere}
            GROUP BY a.account_title, a.account_code
          `),
          execQuery(`
            SELECT
              bg.account_title,
              SUM(bg.budget) AS budget,
              SUM(bg.transfer_from_cfoo) AS transfer_from_cfoo,
              SUM(bg.sbar) AS sbar
            FROM branch b
            JOIN budget bg ON b.branch_code = bg.branch_code
            ${bgWhere}
            GROUP BY bg.account_title
          `)
        ]);

        const codeMap = {};
        for (const r of aRows) {
          if (r.account_code) codeMap[r.account_title] = r.account_code;
        }

        const map = {};
        for (const aRow of aRows) {
          const k = aRow.account_title;
          map[k] = {
            account_title: aRow.account_title,
            account_code: aRow.account_code,
            actual: parseFloat(aRow.actual || 0),
            budget: 0,
            transfer_from_cfoo: 0,
            sbar: 0
          };
        }
        for (const bgRow of bgRows) {
          const k = bgRow.account_title;
          if (!map[k]) {
            map[k] = {
              account_title: bgRow.account_title,
              account_code: codeMap[bgRow.account_title] || '',
              actual: 0,
              budget: parseFloat(bgRow.budget || 0),
              transfer_from_cfoo: parseFloat(bgRow.transfer_from_cfoo || 0),
              sbar: parseFloat(bgRow.sbar || 0)
            };
          } else {
            map[k].budget = parseFloat(bgRow.budget || 0);
            map[k].transfer_from_cfoo = parseFloat(bgRow.transfer_from_cfoo || 0);
            map[k].sbar = parseFloat(bgRow.sbar || 0);
          }
        }

        const specialAccounts = ['Client and Community Services', 'Personnel Costs', 'Trainings, Seminars, and Conference'];
        const mergedRows = Object.values(map).map(row => {
          if (specialAccounts.includes(row.account_title)) {
            row.transfer_from_cfoo = row.actual;
          }
          row.variance = (row.budget + row.transfer_from_cfoo + row.sbar) - row.actual;
          return row;
        });

        res.writeHead(200, CORS_HEADERS);
        res.end(JSON.stringify(sortCustom(mergedRows, EXPENSE_ACCOUNTS)));
      }
    }

    // ── EXPENSES: SUMMARY ─────────────────────────────────────────────
    else if (path === '/api/summary') {
      const aWhere  = buildFilters(req.url, 'a');
      const bgWhere = buildFilters(req.url, 'bg');

      const [aRows, bgRows, bgSpecialRows, aSpecialRows] = await Promise.all([
        execQuery(`
          SELECT COALESCE(SUM(a.actual),0) AS total_actual, COUNT(*) AS total_transactions
          FROM branch b JOIN actual a ON b.branch_code = a.branch_code
          ${aWhere}
        `),
        execQuery(`
          SELECT
            COALESCE(SUM(bg.budget),0)             AS total_budget,
            COALESCE(SUM(bg.transfer_from_cfoo),0) AS total_transfer_cfoo,
            COALESCE(SUM(bg.sbar),0)               AS total_sbar
          FROM branch b JOIN budget bg ON b.branch_code = bg.branch_code
          ${bgWhere}
          AND bg.account_title NOT IN ('Client and Community Services', 'Personnel Costs', 'Trainings, Seminars, and Conference')
        `),
        execQuery(`
          SELECT
            COALESCE(SUM(bg.budget),0) AS total_budget,
            COALESCE(SUM(bg.sbar),0)   AS total_sbar
          FROM branch b JOIN budget bg ON b.branch_code = bg.branch_code
          ${bgWhere}
          AND bg.account_title IN ('Client and Community Services', 'Personnel Costs', 'Trainings, Seminars, and Conference')
        `),
        execQuery(`
          SELECT COALESCE(SUM(a.actual),0) AS total_actual_special
          FROM branch b JOIN actual a ON b.branch_code = a.branch_code
          ${aWhere}
          AND a.account_title IN ('Client and Community Services', 'Personnel Costs', 'Trainings, Seminars, and Conference')
        `)
      ]);

      const total_actual        = parseFloat(aRows[0]?.total_actual || 0);
      const total_transactions  = parseInt(aRows[0]?.total_transactions || 0);

      const base_budget_non_special = parseFloat(bgRows[0]?.total_budget || 0);
      const total_transfer_cfoo_non_special = parseFloat(bgRows[0]?.total_transfer_cfoo || 0);
      const total_sbar_non_special = parseFloat(bgRows[0]?.total_sbar || 0);

      const base_budget_special = parseFloat(bgSpecialRows[0]?.total_budget || 0);
      const total_sbar_special = parseFloat(bgSpecialRows[0]?.total_sbar || 0);

      const total_transfer_cfoo_special = parseFloat(aSpecialRows[0]?.total_actual_special || 0);

      const base_budget = base_budget_non_special + base_budget_special;
      const total_transfer_cfoo = total_transfer_cfoo_non_special + total_transfer_cfoo_special;
      const total_sbar = total_sbar_non_special + total_sbar_special;

      const total_budget = base_budget + total_transfer_cfoo + total_sbar;
      const total_variance = total_budget - total_actual;

      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ total_budget, base_budget, total_actual, total_variance, total_transactions, total_transfer_cfoo, total_sbar }));
    }

    // ── EXPENSES: MONTHLY ─────────────────────────────────────────────
    else if (path === '/api/monthly') {
      const aWhere  = buildFilters(req.url, 'a');
      const bgWhere = buildFilters(req.url, 'bg');

      const [aRows, bgNonSpecial, bgSpecial, aSpecial] = await Promise.all([
        execQuery(`SELECT a.month, SUM(a.actual) AS actual FROM branch b JOIN actual a ON b.branch_code = a.branch_code ${aWhere} GROUP BY a.month`),
        execQuery(`SELECT bg.month, SUM(bg.budget + bg.transfer_from_cfoo + bg.sbar) AS budget FROM branch b JOIN budget bg ON b.branch_code = bg.branch_code ${bgWhere} AND bg.account_title NOT IN ('Client and Community Services', 'Personnel Costs', 'Trainings, Seminars, and Conference') GROUP BY bg.month`),
        execQuery(`SELECT bg.month, SUM(bg.budget + bg.sbar) AS budget FROM branch b JOIN budget bg ON b.branch_code = bg.branch_code ${bgWhere} AND bg.account_title IN ('Client and Community Services', 'Personnel Costs', 'Trainings, Seminars, and Conference') GROUP BY bg.month`),
        execQuery(`SELECT a.month, SUM(a.actual) AS actual FROM branch b JOIN actual a ON b.branch_code = a.branch_code ${aWhere} AND a.account_title IN ('Client and Community Services', 'Personnel Costs', 'Trainings, Seminars, and Conference') GROUP BY a.month`)
      ]);

      const result = [];
      for (let i = 1; i <= 12; i++) {
        const aM = aRows.find(r => parseInt(r.month) === i);
        
        const bNonSpec = bgNonSpecial.find(r => parseInt(r.month) === i);
        const bSpec = bgSpecial.find(r => parseInt(r.month) === i);
        const aSpec = aSpecial.find(r => parseInt(r.month) === i);

        const mBudget = (bNonSpec ? parseFloat(bNonSpec.budget) : 0) +
                        (bSpec ? parseFloat(bSpec.budget) : 0) +
                        (aSpec ? parseFloat(aSpec.actual) : 0);

        if (aM || mBudget > 0) {
          result.push({
            name:   monthNames[i - 1].substring(0, 3),
            budget: mBudget,
            actual: aM ? parseFloat(aM.actual) : 0
          });
        }
      }
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify(result));
    }

    // ── EXPENSES: FILTER OPTIONS ──────────────────────────────────────
    else if (path === '/api/filter-options') {
      const urlObj = new URL(req.url, `http://localhost:${PORT}`);
      const operation = urlObj.searchParams.get('operation');
      const division  = urlObj.searchParams.get('division');
      const region    = urlObj.searchParams.get('region');
      const area      = urlObj.searchParams.get('area');

      // Bidirectional cascade: each dropdown filters by ALL other currently-selected values
      // so that e.g. selecting Region 02 narrows Divisions to those under Region 02
      const base = [];
      if (operation && operation !== 'All Operations') base.push(`operation = ${lit(operation)}`);

      // Division list: filter by operation + region + area (everything except division itself)
      const divConditions = [...base];
      if (region && region !== 'All Regions') divConditions.push(`region = ${lit(region)}`);
      if (area   && area   !== 'All Areas')   divConditions.push(`area = ${lit(area)}`);

      // Region list: filter by operation + division + area (everything except region itself)
      const regConditions = [...base];
      if (division && division !== 'All Divisions') regConditions.push(`division = ${lit(division)}`);
      if (area     && area     !== 'All Areas')     regConditions.push(`area = ${lit(area)}`);

      // Area list: filter by operation + division + region (everything except area itself)
      const areaConditions = [...base];
      if (division && division !== 'All Divisions') areaConditions.push(`division = ${lit(division)}`);
      if (region   && region   !== 'All Regions')   areaConditions.push(`region = ${lit(region)}`);

      // Branch list: filter by all four parents
      const branchConditions = [...base];
      if (division && division !== 'All Divisions') branchConditions.push(`division = ${lit(division)}`);
      if (region   && region   !== 'All Regions')   branchConditions.push(`region = ${lit(region)}`);
      if (area     && area     !== 'All Areas')     branchConditions.push(`area = ${lit(area)}`);

      const divWhere    = divConditions.length    > 0 ? 'WHERE ' + divConditions.join(' AND ')    : '';
      const regWhere    = regConditions.length    > 0 ? 'WHERE ' + regConditions.join(' AND ')    : '';
      const areaWhere   = areaConditions.length   > 0 ? 'WHERE ' + areaConditions.join(' AND ')   : '';
      const branchWhere = branchConditions.length > 0 ? 'WHERE ' + branchConditions.join(' AND ') : '';

      const [branches, operations, divisions, regions, areas] = await Promise.all([
        execQuery(`SELECT DISTINCT CONCAT(branch_code,' _ ',branch_name) AS branch_display FROM branch ${branchWhere} ORDER BY branch_display`),
        execQuery('SELECT DISTINCT operation FROM branch ORDER BY operation'),
        execQuery(`SELECT DISTINCT division  FROM branch ${divWhere}    ORDER BY division`),
        execQuery(`SELECT DISTINCT region    FROM branch ${regWhere}    ORDER BY region`),
        execQuery(`SELECT DISTINCT area      FROM branch ${areaWhere}   ORDER BY area`)
      ]);
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({
        branches:   ['All Branches',        ...branches.map(r => r.branch_display)],
        operations: ['All Operations',      ...operations.map(r => r.operation)],
        divisions:  ['All Divisions',       ...divisions.map(r => r.division)],
        regions:    ['All Regions',         ...regions.map(r => r.region)],
        areas:      ['All Areas',           ...areas.map(r => r.area)],
        accounts:   ['All Account Titles',  ...EXPENSE_ACCOUNTS],
        months:     ['All Months',          ...monthNames]
      }));
    }

    // ── REVENUE: TRANSACTIONS ─────────────────────────────────────────
    else if (path === '/api/revenue/transactions') {
      const urlObj    = new URL(req.url, `http://localhost:${PORT}`);
      const hasBranch = urlObj.searchParams.get('branch') && urlObj.searchParams.get('branch') !== 'All Branches';
      const raWhere   = buildRevenueFilters(req.url, 'ra');
      const rbWhere   = buildRevenueFilters(req.url, 'rb');

      if (hasBranch) {
        const [raRows, rbRows] = await Promise.all([
          execQuery(`
            SELECT
              b.branch_code, b.branch_name, b.area, b.region,
              ra.account_title,
              SUM(ra.actual) AS actual
            FROM branch b
            JOIN revenue_actual ra ON b.branch_code = ra.branch_code
            ${raWhere}
            GROUP BY b.branch_code, b.branch_name, b.area, b.region, ra.account_title
          `),
          execQuery(`
            SELECT
              b.branch_code, b.branch_name, b.area, b.region,
              rb.account_title,
              SUM(rb.budget) AS budget,
              SUM(rb.transfer_from_cfoo) AS transfer_from_cfoo,
              SUM(rb.sbar) AS sbar
            FROM branch b
            JOIN revenue_budget rb ON b.branch_code = rb.branch_code
            ${rbWhere}
            GROUP BY b.branch_code, b.branch_name, b.area, b.region, rb.account_title
          `)
        ]);

        const map = {};
        for (const aRow of raRows) {
          const k = `${aRow.branch_code}::${aRow.account_title}`;
          map[k] = {
            branch_code: aRow.branch_code,
            branch_name: aRow.branch_name,
            area: aRow.area,
            region: aRow.region,
            account_title: aRow.account_title,
            actual: parseFloat(aRow.actual || 0),
            budget: 0,
            transfer_from_cfoo: 0,
            sbar: 0
          };
        }
        for (const bgRow of rbRows) {
          const k = `${bgRow.branch_code}::${bgRow.account_title}`;
          if (!map[k]) {
            map[k] = {
              branch_code: bgRow.branch_code,
              branch_name: bgRow.branch_name,
              area: bgRow.area,
              region: bgRow.region,
              account_title: bgRow.account_title,
              actual: 0,
              budget: parseFloat(bgRow.budget || 0),
              transfer_from_cfoo: parseFloat(bgRow.transfer_from_cfoo || 0),
              sbar: parseFloat(bgRow.sbar || 0)
            };
          } else {
            map[k].budget = parseFloat(bgRow.budget || 0);
            map[k].transfer_from_cfoo = parseFloat(bgRow.transfer_from_cfoo || 0);
            map[k].sbar = parseFloat(bgRow.sbar || 0);
          }
        }

        const mergedRows = Object.values(map).map(row => {
          row.variance = (row.budget + row.transfer_from_cfoo + row.sbar) - row.actual;
          return row;
        });

        res.writeHead(200, CORS_HEADERS);
        res.end(JSON.stringify(sortCustom(mergedRows, REVENUE_ACCOUNTS)));
      } else {
        const [raRows, rbRows] = await Promise.all([
          execQuery(`
            SELECT
              ra.account_title,
              SUM(ra.actual) AS actual
            FROM branch b
            JOIN revenue_actual ra ON b.branch_code = ra.branch_code
            ${raWhere}
            GROUP BY ra.account_title
          `),
          execQuery(`
            SELECT
              rb.account_title,
              SUM(rb.budget) AS budget,
              SUM(rb.transfer_from_cfoo) AS transfer_from_cfoo,
              SUM(rb.sbar) AS sbar
            FROM branch b
            JOIN revenue_budget rb ON b.branch_code = rb.branch_code
            ${rbWhere}
            GROUP BY rb.account_title
          `)
        ]);

        const map = {};
        for (const aRow of raRows) {
          const k = aRow.account_title;
          map[k] = {
            account_title: aRow.account_title,
            actual: parseFloat(aRow.actual || 0),
            budget: 0,
            transfer_from_cfoo: 0,
            sbar: 0
          };
        }
        for (const bgRow of rbRows) {
          const k = bgRow.account_title;
          if (!map[k]) {
            map[k] = {
              account_title: bgRow.account_title,
              actual: 0,
              budget: parseFloat(bgRow.budget || 0),
              transfer_from_cfoo: parseFloat(bgRow.transfer_from_cfoo || 0),
              sbar: parseFloat(bgRow.sbar || 0)
            };
          } else {
            map[k].budget = parseFloat(bgRow.budget || 0);
            map[k].transfer_from_cfoo = parseFloat(bgRow.transfer_from_cfoo || 0);
            map[k].sbar = parseFloat(bgRow.sbar || 0);
          }
        }

        const mergedRows = Object.values(map).map(row => {
          row.variance = (row.budget + row.transfer_from_cfoo + row.sbar) - row.actual;
          return row;
        });

        res.writeHead(200, CORS_HEADERS);
        res.end(JSON.stringify(sortCustom(mergedRows, REVENUE_ACCOUNTS)));
      }
    }

    // ── REVENUE: SUMMARY ─────────────────────────────────────────────
    else if (path === '/api/revenue/summary') {
      const raWhere = buildRevenueFilters(req.url, 'ra');
      const rbWhere = buildRevenueFilters(req.url, 'rb');

      const [aRows, bgRows] = await Promise.all([
        execQuery(`
          SELECT COALESCE(SUM(ra.actual),0) AS total_actual, COUNT(*) AS total_transactions
          FROM branch b JOIN revenue_actual ra ON b.branch_code = ra.branch_code
          ${raWhere}
        `),
        execQuery(`
          SELECT
            COALESCE(SUM(rb.budget),0)             AS total_budget,
            COALESCE(SUM(rb.transfer_from_cfoo),0) AS total_transfer_cfoo,
            COALESCE(SUM(rb.sbar),0)               AS total_sbar
          FROM branch b JOIN revenue_budget rb ON b.branch_code = rb.branch_code
          ${rbWhere}
        `)
      ]);

      const total_actual        = parseFloat(aRows[0]?.total_actual || 0);
      const total_transactions  = parseInt(aRows[0]?.total_transactions || 0);
      const base_budget         = parseFloat(bgRows[0]?.total_budget || 0);
      const total_transfer_cfoo = parseFloat(bgRows[0]?.total_transfer_cfoo || 0);
      const total_sbar          = parseFloat(bgRows[0]?.total_sbar || 0);
      const total_budget        = base_budget + total_transfer_cfoo + total_sbar;
      const total_variance      = total_budget - total_actual;

      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ total_budget, base_budget, total_actual, total_variance, total_transactions, total_transfer_cfoo, total_sbar }));
    }

    // ── REVENUE: MONTHLY ─────────────────────────────────────────────
    else if (path === '/api/revenue/monthly') {
      const raWhere = buildRevenueFilters(req.url, 'ra');
      const rbWhere = buildRevenueFilters(req.url, 'rb');

      const [aRows, bgRows] = await Promise.all([
        execQuery(`SELECT ra.month, SUM(ra.actual) AS actual FROM branch b JOIN revenue_actual ra ON b.branch_code = ra.branch_code ${raWhere} GROUP BY ra.month`),
        execQuery(`SELECT rb.month, SUM(rb.budget + rb.transfer_from_cfoo + rb.sbar) AS budget FROM branch b JOIN revenue_budget rb ON b.branch_code = rb.branch_code ${rbWhere} GROUP BY rb.month`)
      ]);

      const result = [];
      for (let i = 1; i <= 12; i++) {
        const aM = aRows.find(r => parseInt(r.month) === i);
        const bM = bgRows.find(r => parseInt(r.month) === i);
        if (aM || bM) result.push({
          name:   monthNames[i - 1].substring(0, 3),
          budget: bM ? parseFloat(bM.budget) : 0,
          actual: aM ? parseFloat(aM.actual) : 0
        });
      }
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify(result));
    }

    // ── REVENUE: FILTER OPTIONS ──────────────────────────────────────
    else if (path === '/api/revenue/filter-options') {
      const urlObj = new URL(req.url, `http://localhost:${PORT}`);
      const operation = urlObj.searchParams.get('operation');
      const division  = urlObj.searchParams.get('division');
      const region    = urlObj.searchParams.get('region');
      const area      = urlObj.searchParams.get('area');

      // Bidirectional cascade: same logic as expenses filter-options
      const base = [];
      if (operation && operation !== 'All Operations') base.push(`operation = ${lit(operation)}`);

      const divConditions = [...base];
      if (region && region !== 'All Regions') divConditions.push(`region = ${lit(region)}`);
      if (area   && area   !== 'All Areas')   divConditions.push(`area = ${lit(area)}`);

      const regConditions = [...base];
      if (division && division !== 'All Divisions') regConditions.push(`division = ${lit(division)}`);
      if (area     && area     !== 'All Areas')     regConditions.push(`area = ${lit(area)}`);

      const areaConditions = [...base];
      if (division && division !== 'All Divisions') areaConditions.push(`division = ${lit(division)}`);
      if (region   && region   !== 'All Regions')   areaConditions.push(`region = ${lit(region)}`);

      const branchConditions = [...base];
      if (division && division !== 'All Divisions') branchConditions.push(`division = ${lit(division)}`);
      if (region   && region   !== 'All Regions')   branchConditions.push(`region = ${lit(region)}`);
      if (area     && area     !== 'All Areas')     branchConditions.push(`area = ${lit(area)}`);

      const divWhere    = divConditions.length    > 0 ? 'WHERE ' + divConditions.join(' AND ')    : '';
      const regWhere    = regConditions.length    > 0 ? 'WHERE ' + regConditions.join(' AND ')    : '';
      const areaWhere   = areaConditions.length   > 0 ? 'WHERE ' + areaConditions.join(' AND ')   : '';
      const branchWhere = branchConditions.length > 0 ? 'WHERE ' + branchConditions.join(' AND ') : '';

      const [branches, operations, divisions, regions, areas] = await Promise.all([
        execQuery(`SELECT DISTINCT CONCAT(branch_code,' _ ',branch_name) AS branch_display FROM branch ${branchWhere} ORDER BY branch_display`),
        execQuery('SELECT DISTINCT operation FROM branch ORDER BY operation'),
        execQuery(`SELECT DISTINCT division  FROM branch ${divWhere}    ORDER BY division`),
        execQuery(`SELECT DISTINCT region    FROM branch ${regWhere}    ORDER BY region`),
        execQuery(`SELECT DISTINCT area      FROM branch ${areaWhere}   ORDER BY area`)
      ]);
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({
        branches:   ['All Branches',        ...branches.map(r => r.branch_display)],
        operations: ['All Operations',      ...operations.map(r => r.operation)],
        divisions:  ['All Divisions',       ...divisions.map(r => r.division)],
        regions:    ['All Regions',         ...regions.map(r => r.region)],
        areas:      ['All Areas',           ...areas.map(r => r.area)],
        accounts:   ['All Account Titles',  ...REVENUE_ACCOUNTS],
        months:     ['All Months',          ...monthNames]
      }));
    }

    // ── REVENUE: INIT (create tables) ────────────────────────────────
    else if (path === '/api/init-revenue') {
      await execQuery(`
        CREATE TABLE IF NOT EXISTS revenue_budget (
          id SERIAL PRIMARY KEY,
          branch_code VARCHAR NOT NULL,
          month INT NOT NULL,
          account_title VARCHAR NOT NULL,
          budget NUMERIC DEFAULT 0,
          transfer_from_cfoo NUMERIC DEFAULT 0,
          sbar NUMERIC DEFAULT 0,
          created_at TIMESTAMP DEFAULT now()
        );
      `);
      await execQuery(`
        CREATE TABLE IF NOT EXISTS revenue_actual (
          id SERIAL PRIMARY KEY,
          branch_code VARCHAR NOT NULL,
          month INT NOT NULL,
          account_title VARCHAR NOT NULL,
          actual NUMERIC DEFAULT 0,
          created_at TIMESTAMP DEFAULT now()
        );
      `);
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ message: 'Revenue tables (revenue_budget & revenue_actual) ensured.' }));
    }

    // ── MISC ──────────────────────────────────────────────────────────
    else if (path === '/api/status-breakdown') {
      const rows = await execQuery(`SELECT a.status, SUM(a.actual) AS total FROM actual a JOIN branch b ON b.branch_code = a.branch_code GROUP BY a.status`);
      const colors = { approved: '#059669', pending: '#d97706', rejected: '#dc2626' };
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify(rows.map(r => ({
        name:  r.status.charAt(0).toUpperCase() + r.status.slice(1),
        value: parseFloat(r.total),
        color: colors[r.status] || '#6b7280'
      }))));
    }

    else if (path === '/api/top-accounts') {
      const urlObj = new URL(req.url, `http://localhost:${PORT}`);
      const view = urlObj.searchParams.get('view') || 'expenses';
      const tableName = view === 'revenue' ? 'revenue_actual' : 'actual';
      
      const month       = urlObj.searchParams.get('month');
      const operation   = urlObj.searchParams.get('operation');
      const division    = urlObj.searchParams.get('division');
      const region      = urlObj.searchParams.get('region');
      const area        = urlObj.searchParams.get('area');
      const branch      = urlObj.searchParams.get('branch');

      const conditions = [];
      if (month && month !== 'All Months') {
        const idx = monthNames.indexOf(month) + 1;
        conditions.push(`t.month = ${idx}`);
      }
      if (operation && operation !== 'All Operations') {
        conditions.push(`b.operation = ${lit(operation)}`);
      }
      if (division && division !== 'All Divisions') {
        conditions.push(`b.division = ${lit(division)}`);
      }
      if (region && region !== 'All Regions') {
        conditions.push(`b.region = ${lit(region)}`);
      }
      if (area && area !== 'All Areas') {
        conditions.push(`b.area = ${lit(area)}`);
      }
      if (branch && branch !== 'All Branches') {
        conditions.push(`CONCAT(b.branch_code, ' _ ', b.branch_name) = ${lit(branch)}`);
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

      const query = `
        SELECT t.account_title, SUM(t.actual) AS total
        FROM branch b
        JOIN ${tableName} t ON b.branch_code = t.branch_code
        ${whereClause}
        GROUP BY t.account_title
        ORDER BY total DESC
        LIMIT 6
      `;

      const rows = await execQuery(query);
      const colors = ['#2563eb', '#059669', '#d97706', '#dc2626', '#8b5cf6', '#ec4899'];
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify(rows.map((r, i) => ({
        name:  r.account_title,
        value: parseFloat(r.total),
        color: colors[i] || '#6b7280'
      }))));
    }

    else if (path === '/api/breakdown') {
      const urlObj = new URL(req.url, `http://localhost:${PORT}`);
      const view = urlObj.searchParams.get('view') || 'expenses';
      
      const accountTitle = urlObj.searchParams.get('accountTitle');
      const month       = urlObj.searchParams.get('month');
      const operation   = urlObj.searchParams.get('operation');
      const division    = urlObj.searchParams.get('division');
      const region      = urlObj.searchParams.get('region');
      const area        = urlObj.searchParams.get('area');
      const branch      = urlObj.searchParams.get('branch');

      // Determine dimension
      let dimension = 'b.operation';
      let dimensionName = 'operation';
      let displayLabel = 'Operation';

      if (operation && operation !== 'All Operations') {
        dimension = 'b.division';
        dimensionName = 'division';
        displayLabel = 'Division';
        if (division && division !== 'All Divisions') {
          dimension = 'b.region';
          dimensionName = 'region';
          displayLabel = 'Region';
          if (region && region !== 'All Regions') {
            dimension = 'b.area';
            dimensionName = 'area';
            displayLabel = 'Area';
            if (area && area !== 'All Areas') {
              dimension = "CONCAT(b.branch_code, ' - ', b.branch_name)";
              dimensionName = 'branch';
              displayLabel = 'Branch';
            }
          }
        }
      }

      const conditions = [];
      if (accountTitle && accountTitle !== 'All Account Titles') {
        conditions.push(`t.account_title = ${lit(accountTitle)}`);
      }
      if (month && month !== 'All Months') {
        const idx = monthNames.indexOf(month) + 1;
        conditions.push(`t.month = ${idx}`);
      }
      if (operation && operation !== 'All Operations') {
        conditions.push(`b.operation = ${lit(operation)}`);
      }
      if (division && division !== 'All Divisions') {
        conditions.push(`b.division = ${lit(division)}`);
      }
      if (region && region !== 'All Regions') {
        conditions.push(`b.region = ${lit(region)}`);
      }
      if (area && area !== 'All Areas') {
        conditions.push(`b.area = ${lit(area)}`);
      }
      if (branch && branch !== 'All Branches') {
        conditions.push(`CONCAT(b.branch_code, ' _ ', b.branch_name) = ${lit(branch)}`);
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      const tableName = view === 'revenue' ? 'revenue_actual' : 'actual';

      const query = `
        SELECT ${dimension} AS name, SUM(t.actual) AS amount, COUNT(*) AS count
        FROM branch b
        JOIN ${tableName} t ON b.branch_code = t.branch_code
        ${whereClause}
        GROUP BY name
        ORDER BY amount DESC
        LIMIT 10
      `;

      const rows = await execQuery(query);
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({
        dimension: dimensionName,
        label: displayLabel,
        data: rows.map(r => ({ name: r.name || 'Unknown', amount: parseFloat(r.amount || 0), count: parseInt(r.count || 0) }))
      }));
    }

    else if (path === '/api/db-status') {
      const [b, a, bg] = await Promise.all([
        execQuery('SELECT COUNT(*)::int AS c FROM branch'),
        execQuery('SELECT COUNT(*)::int AS c FROM actual'),
        execQuery('SELECT COUNT(*)::int AS c FROM budget')
      ]);
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ branches: b[0]?.c || 0, actuals: a[0]?.c || 0, budgets: bg[0]?.c || 0 }));
    }

    // ── P&L (Profit & Loss): revenue_actual - actual_expenses ──────────
    else if (path === '/api/pnl/summary') {
      const raWhere = buildRevenueFilters(req.url, 'ra');
      const aWhere  = buildFilters(req.url, 'a');

      const [revRows, expRows] = await Promise.all([
        execQuery(`
          SELECT COALESCE(SUM(ra.actual),0) AS total_revenue
          FROM branch b JOIN revenue_actual ra ON b.branch_code = ra.branch_code
          ${raWhere}
        `),
        execQuery(`
          SELECT COALESCE(SUM(a.actual),0) AS total_expenses
          FROM branch b JOIN actual a ON b.branch_code = a.branch_code
          ${aWhere}
        `)
      ]);

      const total_revenue  = parseFloat(revRows[0]?.total_revenue || 0);
      const total_expenses = parseFloat(expRows[0]?.total_expenses || 0);
      const net_income     = total_revenue - total_expenses;

      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ total_revenue, total_expenses, net_income }));
    }

    else if (path === '/api/pnl/monthly') {
      const raWhere = buildRevenueFilters(req.url, 'ra');
      const aWhere  = buildFilters(req.url, 'a');

      const [revRows, expRows] = await Promise.all([
        execQuery(`SELECT ra.month, SUM(ra.actual) AS revenue FROM branch b JOIN revenue_actual ra ON b.branch_code = ra.branch_code ${raWhere} GROUP BY ra.month`),
        execQuery(`SELECT a.month, SUM(a.actual) AS expenses FROM branch b JOIN actual a ON b.branch_code = a.branch_code ${aWhere} GROUP BY a.month`)
      ]);

      const result = [];
      for (let i = 1; i <= 12; i++) {
        const rM = revRows.find(r => parseInt(r.month) === i);
        const eM = expRows.find(r => parseInt(r.month) === i);
        if (rM || eM) {
          const rev = rM ? parseFloat(rM.revenue) : 0;
          const exp = eM ? parseFloat(eM.expenses) : 0;
          result.push({
            name:     monthNames[i - 1].substring(0, 3),
            revenue:  rev,
            expenses: exp,
            net:      rev - exp
          });
        }
      }
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify(result));
    }

    else {
      res.writeHead(404, CORS_HEADERS);
      res.end(JSON.stringify({ error: 'Not found' }));
    }

  } catch (err) {
    console.error('API Error:', err.message);
    res.writeHead(500, CORS_HEADERS);
    res.end(JSON.stringify({ error: err.message }));
  }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`\n🚀 Budget Expenses API Server running at http://localhost:${PORT}`);
  console.log('   EXPENSES: /api/transactions | /api/summary | /api/monthly | /api/filter-options');
  console.log('   REVENUE:  /api/revenue/transactions | /api/revenue/summary | /api/revenue/monthly | /api/revenue/filter-options');
  console.log('   OTHER:    /api/status-breakdown | /api/top-accounts | /api/regional-spending | /api/db-status\n');
});
