import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function execQuery(queryString) {
  return await sql.unsafe(queryString);
}

async function main() {
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
  console.log('✅ revenue_budget table ensured.');

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
  console.log('✅ revenue_actual table ensured.');
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
