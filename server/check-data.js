import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function main() {
  const tables = ['actual', 'branch', 'budget', 'revenue_actual', 'revenue_budget'];
  
  console.log('\n📋 Row counts:');
  for (const t of tables) {
    const unsafeQuery = sql.unsafe(`SELECT COUNT(*)::int AS c FROM "${t}"`);
    const rows = await sql`${unsafeQuery}`;
    console.log(`  ${t}: ${rows[0]?.c ?? 0} rows`);
  }

  console.log('\n📊 revenue_budget sample:');
  const rb = await sql`SELECT * FROM revenue_budget LIMIT 3`;
  console.log(rb.length > 0 ? JSON.stringify(rb, null, 2) : '  (empty)');

  console.log('\n📊 revenue_actual sample:');
  const ra = await sql`SELECT * FROM revenue_actual LIMIT 3`;
  console.log(ra.length > 0 ? JSON.stringify(ra, null, 2) : '  (empty)');
}

main().catch(e => console.error('Error:', e.message));
