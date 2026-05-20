import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function verify() {
  const b = await sql`SELECT COUNT(*)::int AS c FROM branch`;
  const a = await sql`SELECT COUNT(*)::int AS c FROM actual`;
  const bg = await sql`SELECT COUNT(*)::int AS c FROM budget`;
  
  console.log('branch count:', b[0].c);
  console.log('actual count:', a[0].c);
  console.log('budget count:', bg[0].c);
  
  // Sample branch
  const s = await sql`SELECT * FROM branch LIMIT 3`;
  console.log('\nSample branches:', JSON.stringify(s, null, 2));
  
  // Sample actual
  const s2 = await sql`SELECT * FROM actual LIMIT 3`;
  console.log('\nSample actuals:', JSON.stringify(s2, null, 2));
}

verify().catch(e => console.error('Error:', e.message));
