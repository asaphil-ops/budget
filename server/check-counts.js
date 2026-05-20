import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function main() {
  const r = await sql`SELECT COUNT(*)::int AS count FROM revenue_budget WHERE account_title = 'Fines, Penalties & Surcharges'`;
  console.log('Fines, Penalties & Surcharges count:', r[0].count);
  
  const r2 = await sql`SELECT account_title, COUNT(*)::int AS count FROM revenue_budget GROUP BY account_title ORDER BY count DESC LIMIT 10`;
  console.log('\nTop 10 account titles in revenue_budget:', r2);
}

main().catch(e => console.error('Error:', e.message));
