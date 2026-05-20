import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const sql = neon(process.env.DATABASE_URL);

const monthMap = {
  'january': 1, 'february': 2, 'march': 3, 'april': 4,
  'may': 5, 'june': 6, 'july': 7, 'august': 8,
  'september': 9, 'october': 10, 'november': 11, 'december': 12
};

function parseMonth(val) {
  const n = parseInt(val);
  if (!isNaN(n)) return n;
  return monthMap[String(val).toLowerCase().trim()] || 0;
}

function lit(val) {
  if (val === '' || val === null || val === undefined) return 'NULL';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function num(val) {
  const n = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

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

function parseCSV(content) {
  const lines = content.replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/^"|"$/g, ''));
  return { headers, rows: lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => {
      let val = vals[i] ?? '';
      if (val) { val = val.replace(/^"|"$/g, '').trim(); }
      row[h] = val;
    });
    return row;
  })};
}

async function importBudget(csvPath) {
  console.log(`\n📂 Reading: ${csvPath}`);
  const { rows } = parseCSV(readFileSync(csvPath, 'utf-8'));
  console.log(`📊 ${rows.length} rows → revenue_budget`);

  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const values = batch.map(r =>
      `(${lit(r.branch_code)}, ${parseMonth(r.month)}, ${lit(r.account_title)}, ${num(r.budget)}, ${num(r.transfer_from_cfoo)}, ${num(r.sbar)})`
    ).join(',\n');
    const q = `INSERT INTO revenue_budget (branch_code, month, account_title, budget, transfer_from_cfoo, sbar) VALUES ${values}`;
    const unsafeQuery = sql.unsafe(q);
    await sql`${unsafeQuery}`;
    inserted += batch.length;
    process.stdout.write(`  ${inserted}/${rows.length} inserted...\r`);
  }
  console.log(`\n✅ revenue_budget: ${inserted} rows inserted.`);
}

async function importActual(csvPath) {
  console.log(`\n📂 Reading: ${csvPath}`);
  const { rows } = parseCSV(readFileSync(csvPath, 'utf-8'));
  console.log(`📊 ${rows.length} rows → revenue_actual`);

  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const values = batch.map(r =>
      `(${lit(r.branch_code)}, ${parseMonth(r.month)}, ${lit(r.account_title)}, ${num(r.actual)})`
    ).join(',\n');
    const q = `INSERT INTO revenue_actual (branch_code, month, account_title, actual) VALUES ${values}`;
    const unsafeQuery = sql.unsafe(q);
    await sql`${unsafeQuery}`;
    inserted += batch.length;
    process.stdout.write(`  ${inserted}/${rows.length} inserted...\r`);
  }
  console.log(`\n✅ revenue_actual: ${inserted} rows inserted.`);
}

async function main() {
  const budgetPath = 'C:\\Users\\DeoAldrinPagatpatan\\OneDrive - ASA Philippines Foundation, Inc\\Desktop\\revenue_budget.csv';
  const actualPath = 'C:\\Users\\DeoAldrinPagatpatan\\OneDrive - ASA Philippines Foundation, Inc\\Desktop\\revenue._actual.csv';

  console.log('🧹 Truncating revenue_budget and revenue_actual tables...');
  try {
    const unsafeTruncateBudget = sql.unsafe('TRUNCATE TABLE revenue_budget');
    await sql`${unsafeTruncateBudget}`;
    const unsafeTruncateActual = sql.unsafe('TRUNCATE TABLE revenue_actual');
    await sql`${unsafeTruncateActual}`;
    console.log('✅ Tables truncated successfully.');
  } catch (err) {
    console.error('⚠️ Truncation error:', err.message);
    throw err;
  }

  await importBudget(budgetPath);
  await importActual(actualPath);
  console.log('\n🎉 All done!');
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
