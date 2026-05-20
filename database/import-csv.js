// CSV Import Script - Optimized batch import for large datasets
// Run: node database/import-csv.js
//
// Expected CSV filenames:
//   database/branch.csv (from branche.csv)
//   database/actual.csv  
//   database/budget.csv

import { neon } from '@neondatabase/serverless';
import { readFileSync, copyFileSync, existsSync } from 'fs';

const sql = neon(process.env.DATABASE_URL);

const monthMap = {
  'january': 1, 'february': 2, 'march': 3, 'april': 4,
  'may': 5, 'june': 6, 'july': 7, 'august': 8,
  'september': 9, 'october': 10, 'november': 11, 'december': 12,
  'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4,
  'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
};

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += char; }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(filepath) {
  try {
    const data = readFileSync(filepath, 'utf8');
    const lines = data.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      const obj = {};
      headers.forEach((h, i) => { 
        let val = values[i] || null;
        if (val) { val = val.replace(/^"|"$/g, '').trim(); }
        obj[h.trim().toLowerCase()] = val; 
      });
      return obj;
    });
    console.log('   ' + filepath + ': ' + rows.length + ' rows');
    return rows;
  } catch (err) {
    console.log('   ' + filepath + ': File not found, skipping');
    return [];
  }
}

function cleanNumber(val) {
  if (!val) return 0;
  return parseFloat(String(val).replace(/,/g, '')) || 0;
}

function getMonthNumber(val) {
  if (!val) return 1;
  const num = parseInt(val);
  if (!isNaN(num) && num >= 1 && num <= 12) return num;
  return monthMap[String(val).toLowerCase().trim()] || 1;
}

function batchArray(arr, size) {
  const batches = [];
  for (let i = 0; i < arr.length; i += size) {
    batches.push(arr.slice(i, i + size));
  }
  return batches;
}

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

// Execute a safe raw query using the proper API
async function execQuery(queryString) {
  // sql.unsafe() returns an UnsafeRawSql object that must be passed into a template literal
  const unsafeQuery = sql.unsafe(queryString);
  // We pass it through a template literal to execute it
  return await sql`${unsafeQuery}`;
}

async function importData() {
  console.log('\n=== CSV Import to Neon Database ===\n');

  // Copy branche.csv to branch.csv if needed
  if (existsSync('./database/branche.csv') && !existsSync('./database/branch.csv')) {
    copyFileSync('./database/branche.csv', './database/branch.csv');
    console.log('   ✅ Created branch.csv from branche.csv');
  }

  // Parse all CSVs
  const budgets = parseCSV('./database/budget.csv');
  const actuals = parseCSV('./database/actual.csv');
  const branches = parseCSV('./database/branch.csv');

  if (!budgets.length && !actuals.length && !branches.length) {
    console.log('No CSV files found. Exiting.');
    return;
  }

  // Verify connection
  console.log('\nVerifying database connection...');
  try {
    await execQuery('SELECT 1');
    console.log('   ✅ Connected to Neon database\n');
  } catch (err) {
    console.log('   ❌ Connection failed:', err.message);
    process.exit(1);
  }

  // Clear existing data
  console.log('Clearing existing data...');
  try { await execQuery('DELETE FROM budget'); console.log('   ✅ Cleared budget'); } catch (e) { process.exit(1); }
  try { await execQuery('DELETE FROM actual'); console.log('   ✅ Cleared actual'); } catch (e) { console.log('   ⚠', e.message); }
  try { await execQuery('DELETE FROM branch'); console.log('   ✅ Cleared branch\n'); } catch (e) { console.log('   ⚠', e.message); }

  // BRANCHES
  if (branches.length > 0) {
    console.log('Importing branches...');
    const branchBatches = batchArray(branches, 50);
    let branchSuccess = 0;
    for (const batch of branchBatches) {
      try {
        const values = batch.map(b => {
          const code = b.branch_code || '';
          const name = b.branch_name || b.name || '';
          const area = b.area || '';
          const region = b.region || '';
          const division = b.division || '';
          const operation = b.operation || '';
          return `(${esc(code)},${esc(name)},${esc(area)},${esc(region)},${esc(division)},${esc(operation)})`;
        }).join(',');
        await execQuery('INSERT INTO branch (branch_code, branch_name, area, region, division, operation) VALUES ' + values + ' ON CONFLICT (branch_code) DO NOTHING');
        branchSuccess += batch.length;
      } catch (err) {
        console.log('   [SKIP]', err.message.substring(0, 100));
      }
      process.stdout.write('   ' + branchSuccess + ' / ' + branches.length + '\r');
    }
    console.log('\n   Imported ' + branchSuccess + ' branches\n');
  }

  // BUDGETS
  if (budgets.length > 0) {
    console.log('Importing budgets...');
    const budgetBatches = batchArray(budgets, 100);
    let budgetSuccess = 0;
    for (const batch of budgetBatches) {
      try {
        const values = batch.map(b => {
          const code = b.branch_code || '';
          const month = getMonthNumber(b.month);
          const budgetAmount = cleanNumber(b.budget);
          const transferCfoo = cleanNumber(b.transfer_from_cfoo || 0);
          const sbarVal = cleanNumber(b.sbar || 0);
          const accountTitle = b.account_title || '';
          return `(${esc(code)},${month},${budgetAmount},${transferCfoo},${sbarVal},${esc(accountTitle)},'ACC-001')`;
        }).join(',');
        await execQuery('INSERT INTO budget (branch_code, month, budget, transfer_from_cfoo, sbar, account_title, account_code) VALUES ' + values + ' ON CONFLICT (branch_code, month, account_title) DO UPDATE SET budget = EXCLUDED.budget, transfer_from_cfoo = EXCLUDED.transfer_from_cfoo, sbar = EXCLUDED.sbar');
        budgetSuccess += batch.length;
      } catch (err) {
        // Log once, not for every batch
        if (budgetSuccess === 0) console.log('   [ERROR]', err.message.substring(0, 150));
      }
      process.stdout.write('   ' + budgetSuccess + ' / ' + budgets.length + '\r');
    }
    console.log('\n   Imported ' + budgetSuccess + ' budgets\n');
  }

  // ACTUALS
  if (actuals.length > 0) {
    console.log('Importing actuals...');
    const actualBatches = batchArray(actuals, 100);
    let actualSuccess = 0;
    for (const batch of actualBatches) {
      try {
        const values = batch.map(a => {
          const code = a.branch_code || '';
          const month = getMonthNumber(a.month);
          const actualAmount = cleanNumber(a.actual);
          const accountTitle = a.account_title || '';
          const status = a.status || 'pending';
          const dateVal = a.date || null;
          const desc = a.description || null;
          return `(${esc(code)},${month},${actualAmount},${esc(accountTitle)},'ACC-001',${esc(status)},${dateVal ? esc(dateVal) : 'NULL'},${desc ? esc(desc) : 'NULL'})`;
        }).join(',');
        await execQuery('INSERT INTO actual (branch_code, month, actual, account_title, account_code, status, date, description) VALUES ' + values);
        actualSuccess += batch.length;
      } catch (err) {
        if (actualSuccess === 0) console.log('   [ERROR]', err.message.substring(0, 150));
      }
      process.stdout.write('   ' + actualSuccess + ' / ' + actuals.length + '\r');
    }
    console.log('\n   Imported ' + actualSuccess + ' actuals\n');
  }

  console.log('\n=== IMPORT COMPLETE ===');
}

importData();
